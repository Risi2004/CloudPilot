const Deployment = require('../models/Deployment');
const credentialService = require('../services/credentialService');
const renderApiService = require('../services/renderApiService');
const vercelApiService = require('../services/vercelApiService');

class DeploymentAgentError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

class DeploymentStoppedSignal extends Error {}

// Tracks which deployments this process is actively driving, so requestStop()
// can tell an active run (which will notice the stop flag itself) apart from
// an orphaned one (e.g. after a server restart) that needs cleaning up now.
const runningJobs = new Map();

const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

const DATASTORE_KEYWORDS = /postgres|database|mysql|mongo|redis|cache|datastore|key.?value/i;
const FRONTEND_KEYWORDS = /frontend|client|web(?!hook)|ui\b|static/i;
const BACKEND_KEYWORDS = /backend|server|api|worker/i;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(str) {
  return (
    String(str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'app'
  );
}

function mapLanguageToRenderRuntime(language) {
  const l = String(language || '').toLowerCase();
  if (l.includes('python')) return 'python';
  if (l.includes('ruby')) return 'ruby';
  if (l.includes('go')) return 'go';
  if (l.includes('rust')) return 'rust';
  if (l.includes('elixir')) return 'elixir';
  return 'node';
}

function mapPlanTier(planText) {
  const p = String(planText || '').toLowerCase();
  if (p.includes('free') || p.includes('hobby')) return 'free';
  if (p.includes('standard')) return 'standard';
  if (p.includes('pro')) return 'pro';
  return 'starter';
}

function mapRenderRegion(regionText) {
  const r = String(regionText || '').toLowerCase();
  const known = ['frankfurt', 'oregon', 'ohio', 'singapore', 'virginia'];
  return known.find((k) => r.includes(k)) || 'oregon';
}

function inferRootDir(componentName, detectedFiles) {
  const dirs = new Set();
  (detectedFiles || []).forEach((filePath) => {
    const parts = String(filePath).split('/');
    if (parts.length > 1) dirs.add(parts[0]);
  });
  const lowerName = String(componentName || '').toLowerCase();
  for (const dir of dirs) {
    if (lowerName.includes(dir.toLowerCase()) || dir.toLowerCase().includes(lowerName)) return dir;
  }
  if (FRONTEND_KEYWORDS.test(componentName)) {
    const match = Array.from(dirs).find((d) => FRONTEND_KEYWORDS.test(d));
    if (match) return match;
  }
  if (BACKEND_KEYWORDS.test(componentName)) {
    const match = Array.from(dirs).find((d) => BACKEND_KEYWORDS.test(d));
    if (match) return match;
  }
  return '';
}

function findServiceConfigFor(platformInterview, platform) {
  const rec = platformInterview && platformInterview.recommendation;
  const list = Array.isArray(rec && rec.recommendations) ? rec.recommendations : rec ? [rec] : [];
  const match = list.find((r) => String(r.platform || '').toLowerCase() === platform);
  return (match && match.serviceConfig) || {};
}

// Only a bare http(s) localhost URL is treated as "probably points at another
// service" - deliberately excludes DB/cache connection strings like
// postgres://localhost/db or redis://localhost:6379, which also contain
// "localhost" but must never be silently swapped for another service's URL.
const LOCAL_HTTP_URL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i;

// If the user uploaded separate env files per component (EnvUploadPrompt's
// per-section upload), each variable carries an explicit `scope` matching
// that component's name - that's ground truth and should win outright, no
// heuristics needed. A component only sees vars explicitly scoped to it plus
// any unscoped ("shared") ones. If nothing in this repo's env vars has a
// scope at all (the older, single-list flow, or a monolith), every var is a
// candidate everywhere and the naming-convention heuristic decides inclusion,
// same as before.
function detectEnvVarCandidates(analysis, componentName) {
  const all = analysis.envVariables || [];
  const anyScoped = all.some((v) => v.scope);

  return all
    .filter((v) => !anyScoped || !v.scope || String(v.scope).toLowerCase() === String(componentName).toLowerCase())
    .map((v) => ({
      key: v.key,
      value: v.value,
      looksLikeLocalLink: LOCAL_HTTP_URL.test(v.value || ''),
      linksToComponent: null,
      explicitlyScoped: anyScoped && !!v.scope,
    }));
}

// Env vars are detected repo-wide (the Code Analysis Agent doesn't scope them
// per directory), so every component starts with the same candidate list.
// Rather than defaulting every var to "included" on every component - which
// would ship backend secrets to a frontend deployment by default - use each
// framework's own client-exposure convention to default frontend components
// to ONLY their build-time-public vars, and backend components to everything
// else. The user can still override any single var via its checkbox.
const CLIENT_EXPOSED_PREFIX = /^(VITE_|NEXT_PUBLIC_|REACT_APP_|PUBLIC_|GATSBY_|EXPO_PUBLIC_|NUXT_PUBLIC_)/i;

function classifyComponentSide(component) {
  // Deliberately checks only the component's semantic name ("Frontend",
  // "Backend", "API", ...), not its role/service text - those describe the
  // platform's generic product type (e.g. Render calls almost everything a
  // "Web Service", which would otherwise false-match the "web" keyword and
  // misclassify a backend as a frontend).
  const name = component.name || '';
  if (FRONTEND_KEYWORDS.test(name)) return 'frontend';
  if (BACKEND_KEYWORDS.test(name)) return 'backend';
  return 'unknown';
}

// A "build command" that actually starts a dev server (or any long-running
// process) never exits, so the deploy hangs forever waiting for a "build" to
// finish that was never going to finish. LLM-suggested commands (from the
// Platform Selection interview) aren't validated against the real repo, so
// reject anything that looks like a dev/serve/start invocation rather than
// trusting it blindly - falling back to '' (the platform's own auto-detect)
// is always safer than running the wrong script.
const DEV_LIKE_COMMAND = /(^|\s)(dev|serve|start)(\s|$)|vite\s*$|next\s+dev|react-scripts\s+start|webpack(-dev-server|\s+serve)/i;

function sanitizeBuildCommand(candidate) {
  const trimmed = String(candidate || '').trim();
  if (!trimmed || DEV_LIKE_COMMAND.test(trimmed)) return '';
  return trimmed;
}

function defaultIncluded(side, key, explicitlyScoped) {
  if (explicitlyScoped) return true; // the user explicitly assigned this var to this component via a per-section upload - trust it outright
  const isClientExposed = CLIENT_EXPOSED_PREFIX.test(key);
  if (side === 'frontend') return isClientExposed;
  if (side === 'backend') return !isClientExposed;
  return true; // can't classify (e.g. a single monolith component) - show everything
}

/**
 * Builds the editable, user-reviewable deployment plan from everything the
 * upstream agents have already produced. Pure/no side effects - safe to call
 * repeatedly (e.g. if the user re-opens the review step).
 */
function buildDeploymentPlan({ analysis, platformInterview, architectureOption }) {
  const result = analysis.result || {};
  const detectedFiles = result.detectedFiles || [];
  const buildRequirements = result.buildRequirements || {};

  // The Platform Selection Agent's serviceConfig.plan reflects a single,
  // one-time recommendation made *before* architecture options even existed -
  // it has nothing to do with which of the 3-5 options (each a genuinely
  // different cost tier) the developer is now deploying. If the CHOSEN option
  // is the $0/mo free-tier one, that must win: every Render component defaults
  // to the actual "free" plan regardless of what that earlier interview said,
  // otherwise a developer who picked the free option would silently get
  // billed on whatever plan the interview happened to suggest.
  const costEstimate = architectureOption.costEstimate || {};
  const isFreeOption = Number(costEstimate.monthlyLowUSD) === 0 && Number(costEstimate.monthlyHighUSD) === 0;

  const rawComponents = Array.isArray(architectureOption.components) ? architectureOption.components : [];
  const components = rawComponents.map((c) => {
    const declaredPlatform = String(c.platform || '').toLowerCase();
    const platform = ['render', 'vercel'].includes(declaredPlatform)
      ? declaredPlatform
      : /vercel/i.test(c.service || '')
      ? 'vercel'
      : 'render';
    const deployable = !DATASTORE_KEYWORDS.test(`${c.name || ''} ${c.service || ''} ${c.role || ''}`);
    const serviceConfig = findServiceConfigFor(platformInterview, platform);
    const side = classifyComponentSide(c);

    // Vercel's own framework auto-detection (from the repo's package.json /
    // config files) is far more reliable than a freeform command an earlier
    // interview happened to suggest - default to '' (auto-detect) there and
    // only use the interview's value if it survives sanitization AND the
    // developer explicitly wants it (they can always type one in Review).
    // Render has no equivalent auto-detection, so it still inherits a
    // sanitized default from the interview/repo analysis.
    const buildCommand =
      platform === 'vercel'
        ? ''
        : sanitizeBuildCommand(serviceConfig.buildCommand) || sanitizeBuildCommand(buildRequirements.buildCommand);

    return {
      name: c.name || 'Component',
      platform,
      deployable,
      category: deployable ? 'service' : 'datastore',
      role: c.role || '',
      service: c.service || '',
      rootDir: inferRootDir(c.name, detectedFiles),
      serviceType: 'web_service',
      runtime: mapLanguageToRenderRuntime(result.language),
      buildCommand,
      startCommand: serviceConfig.startCommand || buildRequirements.startCommand || '',
      plan: isFreeOption ? 'free' : mapPlanTier(serviceConfig.plan),
      region: mapRenderRegion(serviceConfig.region),
      vercelFramework: null,
      branch: null,
      envVars: deployable
        ? detectEnvVarCandidates(analysis, c.name).map((v) => ({
            ...v,
            included: defaultIncluded(side, v.key, v.explicitlyScoped),
          }))
        : [],
    };
  });

  const deployableNames = components.filter((c) => c.deployable).map((c) => c.name);
  if (deployableNames.length === 2) {
    // In the common two-service split, default any localhost-shaped value to point at "the other" component.
    components.forEach((c) => {
      if (!c.deployable) return;
      const other = deployableNames.find((n) => n !== c.name);
      c.envVars.forEach((v) => {
        if (v.looksLikeLocalLink) {
          v.linksToComponent = other;
          // defaultIncluded() classified this var purely off naming convention
          // (e.g. no VITE_/NEXT_PUBLIC_ prefix), which can mark it excluded
          // even though it's the very variable that's supposed to carry the
          // other service's URL - an explicit cross-link always overrides
          // that guess, otherwise the wiring step silently skips it later
          // (it only processes vars where included !== false).
          v.included = true;
        }
      });
    });
  }

  return {
    architectureOptionId: architectureOption.id,
    repoFullName: analysis.repoFullName,
    components,
  };
}

function buildResourceName(repoFullName, componentName, deploymentId) {
  const repoSlug = slugify((repoFullName || '').split('/')[1] || repoFullName || 'app');
  const suffix = String(deploymentId).slice(-6);
  return `${repoSlug}-${slugify(componentName)}-${suffix}`.slice(0, 60);
}

function buildInitialSteps(plan) {
  const steps = [{ key: 'validate_credentials', label: 'Validate platform credentials' }];
  plan.components
    .filter((c) => c.deployable)
    .forEach((c) => {
      steps.push({ key: `create:${c.name}`, label: `Create ${c.name} on ${c.platform === 'render' ? 'Render' : 'Vercel'}` });
      steps.push({ key: `deploy:${c.name}`, label: `Deploy ${c.name}` });
    });
  steps.push({ key: 'wire_env_vars', label: 'Wire cross-service environment variables' });
  steps.push({ key: 'finalize', label: 'Finalize deployment' });
  return steps.map((s) => ({ ...s, status: 'pending', logs: [] }));
}

async function updateStep(deploymentId, stepKey, patch) {
  const set = {};
  Object.entries(patch).forEach(([k, v]) => {
    set[`steps.$[s].${k}`] = v;
  });
  await Deployment.updateOne({ _id: deploymentId }, { $set: set }, { arrayFilters: [{ 's.key': stepKey }] });
}

async function appendStepLog(deploymentId, stepKey, lines) {
  if (!lines || !lines.length) return;
  await Deployment.updateOne(
    { _id: deploymentId },
    { $push: { 'steps.$[s].logs': { $each: lines } } },
    { arrayFilters: [{ 's.key': stepKey }] }
  );
}

async function ensureStep(deploymentId, key, label) {
  await Deployment.updateOne(
    { _id: deploymentId, 'steps.key': { $ne: key } },
    { $push: { steps: { key, label, status: 'pending', logs: [] } } }
  );
}

async function pushResource(deploymentId, resource) {
  await Deployment.updateOne({ _id: deploymentId }, { $push: { resources: resource } });
}

async function checkStopOrThrow(deploymentId) {
  const doc = await Deployment.findById(deploymentId).select('status').lean();
  if (doc && doc.status === 'stopping') {
    await rollbackDeployment(deploymentId);
    throw new DeploymentStoppedSignal();
  }
}

async function createResourceStep(deploymentId, deployment, component, cred) {
  const stepKey = `create:${component.name}`;
  await updateStep(deploymentId, stepKey, { status: 'running', startedAt: new Date() });
  try {
    const resourceName = buildResourceName(deployment.repoFullName, component.name, deploymentId);
    const activeEnvVars = component.envVars.filter((v) => v.included !== false && !v.linksToComponent);

    if (component.platform === 'render') {
      const payload = {
        type: component.serviceType || 'web_service',
        name: resourceName,
        ownerId: cred.metadata.ownerId,
        repo: `https://github.com/${deployment.repoFullName}`,
        autoDeploy: 'no',
        rootDir: component.rootDir || undefined,
        envVars: activeEnvVars.map((v) => ({ key: v.key, value: v.value })),
        serviceDetails: {
          runtime: component.runtime || 'node',
          plan: component.plan || 'starter',
          region: component.region || 'oregon',
          envSpecificDetails: {
            buildCommand: component.buildCommand || '',
            startCommand: component.startCommand || '',
          },
        },
      };
      const created = await renderApiService.createService(cred.apiKey, payload);
      await pushResource(deploymentId, {
        componentName: component.name,
        platform: 'render',
        resourceType: 'render_service',
        resourceName,
        platformResourceId: created.service.id,
        latestDeployId: created.deployId,
        dashboardUrl: created.service.dashboardUrl || null,
        liveUrl: (created.service.serviceDetails && created.service.serviceDetails.url) || null,
      });
    } else {
      const project = await vercelApiService.createProject(
        cred.apiKey,
        {
          name: resourceName,
          framework: component.vercelFramework || null,
          rootDirectory: component.rootDir || undefined,
          buildCommand: component.buildCommand || undefined,
          gitRepository: { type: 'github', repo: deployment.repoFullName },
        },
        { teamId: cred.metadata.teamId }
      );
      await pushResource(deploymentId, {
        componentName: component.name,
        platform: 'vercel',
        resourceType: 'vercel_project',
        resourceName,
        platformResourceId: project.id,
        latestDeployId: null,
        dashboardUrl: null,
        liveUrl: null,
      });
    }
    await updateStep(deploymentId, stepKey, { status: 'success', finishedAt: new Date(), message: 'Resource created.' });
  } catch (err) {
    await updateStep(deploymentId, stepKey, { status: 'failed', finishedAt: new Date(), message: err.message });
    throw err;
  }
}

async function pollRenderDeploy(deploymentId, stepKey, cred, resource, deployId) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  // A time cursor (not an array-length/index count) so logs keep flowing no
  // matter how many lines a verbose build produces - an index-based "seen
  // count" against a fixed-size page would silently stop advancing forever
  // once the build passed that page size, even though the real deploy kept
  // progressing (or had already finished) on Render's side.
  let startTime;
  while (Date.now() < deadline) {
    await checkStopOrThrow(deploymentId);
    const deploy = await renderApiService.getDeploy(cred.apiKey, resource.platformResourceId, deployId);

    try {
      const { logs, nextStartTime } = await renderApiService.listBuildLogs(cred.apiKey, {
        ownerId: cred.metadata.ownerId,
        resource: resource.platformResourceId,
        startTime,
        limit: 100,
      });
      if (logs.length) {
        const lines = logs.map((l) => l.message || l.text || JSON.stringify(l));
        await appendStepLog(deploymentId, stepKey, lines);
      }
      if (nextStartTime) startTime = nextStartTime;
    } catch (logErr) {
      // Logs are best-effort - never fail the deploy just because log fetching hiccuped.
    }

    if (renderApiService.RENDER_DEPLOY_TERMINAL_SUCCESS.has(deploy.status)) return;
    if (renderApiService.RENDER_DEPLOY_TERMINAL_FAILURE.has(deploy.status)) {
      throw new Error(`Render deploy ended with status "${deploy.status}".`);
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error('Timed out waiting for the Render deploy to go live (10 minutes).');
}

async function pollVercelDeployment(deploymentId, stepKey, cred, deploymentRecordId) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  // Same time-cursor fix as pollRenderDeploy - track the last event's
  // timestamp, not how many we've shown, so logs never silently stop
  // advancing once a build passes a fixed page size.
  let since;
  let readyState = 'QUEUED';
  while (Date.now() < deadline) {
    await checkStopOrThrow(deploymentId);
    const polled = await vercelApiService.getDeployment(cred.apiKey, deploymentRecordId, { teamId: cred.metadata.teamId });
    readyState = polled.readyState;

    try {
      const events = await vercelApiService.getDeploymentEvents(cred.apiKey, deploymentRecordId, {
        teamId: cred.metadata.teamId,
        since,
      });
      if (events.length) {
        const lines = events
          .map((e) => e.text || (e.payload && e.payload.text) || e.type)
          .filter(Boolean);
        await appendStepLog(deploymentId, stepKey, lines);
        const maxCreated = events.reduce((max, e) => Math.max(max, e.created || 0), since || 0);
        if (maxCreated > (since || 0)) since = maxCreated + 1;
      }
    } catch (logErr) {
      // Best-effort logs, same as Render.
    }

    if (vercelApiService.VERCEL_DEPLOY_TERMINAL_SUCCESS.has(readyState)) return polled;
    if (vercelApiService.VERCEL_DEPLOY_TERMINAL_FAILURE.has(readyState)) {
      throw new Error(`Vercel deployment ended with state "${readyState}".`);
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error('Timed out waiting for the Vercel deployment to become ready (10 minutes).');
}

async function deployAndPollStep(deploymentId, deployment, component, cred) {
  const stepKey = `deploy:${component.name}`;
  await updateStep(deploymentId, stepKey, { status: 'running', startedAt: new Date() });
  try {
    const resource = deployment.resources.find((r) => r.componentName === component.name);

    if (component.platform === 'render') {
      await pollRenderDeploy(deploymentId, stepKey, cred, resource, resource.latestDeployId);
    } else {
      const [org, repo] = deployment.repoFullName.split('/');
      const dep = await vercelApiService.createDeployment(
        cred.apiKey,
        {
          name: resource.resourceName,
          project: resource.platformResourceId,
          target: 'production',
          gitSource: { type: 'github', ref: component.branch || 'main', org, repo },
        },
        { teamId: cred.metadata.teamId }
      );
      await Deployment.updateOne(
        { _id: deploymentId, 'resources.componentName': component.name },
        { $set: { 'resources.$.latestDeployId': dep.id, 'resources.$.dashboardUrl': dep.inspectorUrl || null } }
      );
      const finalDep = await pollVercelDeployment(deploymentId, stepKey, cred, dep.id);
      const liveUrl = finalDep.url ? `https://${finalDep.url}` : null;
      await Deployment.updateOne(
        { _id: deploymentId, 'resources.componentName': component.name },
        { $set: { 'resources.$.liveUrl': liveUrl } }
      );
    }
    await updateStep(deploymentId, stepKey, { status: 'success', finishedAt: new Date(), message: 'Deployed successfully.' });
  } catch (err) {
    if (err instanceof DeploymentStoppedSignal) throw err;
    await updateStep(deploymentId, stepKey, { status: 'failed', finishedAt: new Date(), message: err.message });
    throw err;
  }
}

async function wireEnvVarsStep(deploymentId, deployment, creds) {
  const stepKey = 'wire_env_vars';
  await updateStep(deploymentId, stepKey, { status: 'running', startedAt: new Date() });
  try {
    const deployableComponents = deployment.plan.components.filter((c) => c.deployable);
    const resourceByName = Object.fromEntries(deployment.resources.map((r) => [r.componentName, r]));
    let anyWired = false;

    for (const component of deployableComponents) {
      await checkStopOrThrow(deploymentId);
      const linkedVars = (component.envVars || []).filter(
        (v) => v.included !== false && v.linksToComponent && resourceByName[v.linksToComponent]
      );
      if (!linkedVars.length) continue;
      anyWired = true;

      const resource = resourceByName[component.name];
      const cred = creds[component.platform];
      const staticVars = (component.envVars || [])
        .filter((v) => v.included !== false && !v.linksToComponent)
        .map((v) => ({ key: v.key, value: v.value }));
      const resolvedVars = linkedVars.map((v) => ({
        key: v.key,
        value: resourceByName[v.linksToComponent].liveUrl || '',
      }));
      const allVars = [...staticVars, ...resolvedVars];

      if (component.platform === 'render') {
        await renderApiService.updateEnvVars(cred.apiKey, resource.platformResourceId, allVars);
        const redeploy = await renderApiService.triggerDeploy(cred.apiKey, resource.platformResourceId);
        await pollRenderDeploy(deploymentId, stepKey, cred, resource, redeploy.id);
      } else {
        await vercelApiService.createEnvVars(
          cred.apiKey,
          resource.platformResourceId,
          allVars.map((v) => ({ key: v.key, value: v.value, type: 'encrypted', target: ['production'] })),
          { teamId: cred.metadata.teamId }
        );
        const [org, repo] = deployment.repoFullName.split('/');
        const redeploy = await vercelApiService.createDeployment(
          cred.apiKey,
          {
            name: resource.resourceName,
            project: resource.platformResourceId,
            target: 'production',
            gitSource: { type: 'github', ref: component.branch || 'main', org, repo },
          },
          { teamId: cred.metadata.teamId }
        );
        await pollVercelDeployment(deploymentId, stepKey, cred, redeploy.id);
      }
    }
    await updateStep(deploymentId, stepKey, {
      status: anyWired ? 'success' : 'skipped',
      finishedAt: new Date(),
      message: anyWired ? 'Cross-service environment variables applied.' : 'No cross-service links in this plan.',
    });
  } catch (err) {
    if (err instanceof DeploymentStoppedSignal) throw err;
    await updateStep(deploymentId, stepKey, { status: 'failed', finishedAt: new Date(), message: err.message });
    throw err;
  }
}

async function finalizeStep(deploymentId) {
  await updateStep(deploymentId, 'finalize', { status: 'running', startedAt: new Date() });
  const deployment = await Deployment.findById(deploymentId).lean();
  const resources = deployment.resources || [];
  const primary =
    resources.find((r) => FRONTEND_KEYWORDS.test(r.componentName)) ||
    resources.find((r) => r.platform === 'vercel') ||
    resources[0];

  const finalLinks = resources
    .filter((r) => r.liveUrl)
    .map((r) => ({ label: r.componentName, url: r.liveUrl }))
    .sort((a, b) => {
      if (primary && a.label === primary.componentName) return -1;
      if (primary && b.label === primary.componentName) return 1;
      return 0;
    });

  await Deployment.updateOne({ _id: deploymentId }, { $set: { status: 'succeeded', finalLinks, completedAt: new Date() } });
  await updateStep(deploymentId, 'finalize', { status: 'success', finishedAt: new Date(), message: 'Deployment complete.' });
}

async function markFailed(deploymentId, err) {
  console.error(`Deployment ${deploymentId} failed:`, err);
  await Deployment.updateOne(
    { _id: deploymentId, status: { $in: ['running', 'stopping'] } },
    { $set: { status: 'failed', error: err.message, completedAt: new Date() } }
  );
  await Deployment.updateOne(
    { _id: deploymentId, 'steps.status': 'running' },
    { $set: { 'steps.$[s].status': 'failed', 'steps.$[s].message': err.message, 'steps.$[s].finishedAt': new Date() } },
    { arrayFilters: [{ 's.status': 'running' }] }
  );
}

async function rollbackDeployment(deploymentId) {
  const deployment = await Deployment.findById(deploymentId).lean();
  if (!deployment) return;
  if (!['stopping', 'running', 'failed'].includes(deployment.status)) return;

  await ensureStep(deploymentId, 'rollback', 'Roll back created resources');
  await updateStep(deploymentId, 'rollback', { status: 'running', startedAt: new Date() });

  const logs = [];
  for (const resource of [...(deployment.resources || [])].reverse()) {
    try {
      const { apiKey, metadata } = await credentialService.getDecryptedKey(deployment.userId, resource.platform);
      if (resource.platform === 'render') {
        await renderApiService.deleteService(apiKey, resource.platformResourceId);
      } else {
        await vercelApiService.deleteProject(apiKey, resource.platformResourceId, { teamId: metadata.teamId });
      }
      logs.push(`Deleted ${resource.componentName} (${resource.platform}).`);
    } catch (err) {
      logs.push(`Failed to delete ${resource.componentName} (${resource.platform}): ${err.message}`);
    }
  }
  await appendStepLog(deploymentId, 'rollback', logs);
  await updateStep(deploymentId, 'rollback', { status: 'success', finishedAt: new Date(), message: 'Rollback complete.' });

  const finalStatus = deployment.status === 'failed' ? 'failed' : 'stopped';
  await Deployment.updateOne({ _id: deploymentId }, { $set: { status: finalStatus, completedAt: new Date() } });
}

async function runOrchestrator(deploymentId) {
  try {
    const deployment = await Deployment.findById(deploymentId).lean();
    if (!deployment) return;

    await updateStep(deploymentId, 'validate_credentials', { status: 'running', startedAt: new Date() });
    const deployableComponents = deployment.plan.components.filter((c) => c.deployable);
    const platforms = [...new Set(deployableComponents.map((c) => c.platform))];
    const creds = {};
    for (const platform of platforms) {
      creds[platform] = await credentialService.getDecryptedKey(deployment.userId, platform);
    }
    await updateStep(deploymentId, 'validate_credentials', {
      status: 'success',
      finishedAt: new Date(),
      message: 'All required platform credentials are present.',
    });

    for (const component of deployableComponents) {
      await checkStopOrThrow(deploymentId);
      const current = await Deployment.findById(deploymentId).lean();
      await createResourceStep(deploymentId, current, component, creds[component.platform]);
      await checkStopOrThrow(deploymentId);
      const withResource = await Deployment.findById(deploymentId).lean();
      await deployAndPollStep(deploymentId, withResource, component, creds[component.platform]);
    }

    await checkStopOrThrow(deploymentId);
    const beforeWiring = await Deployment.findById(deploymentId).lean();
    await wireEnvVarsStep(deploymentId, beforeWiring, creds);

    await finalizeStep(deploymentId);
  } catch (err) {
    if (err instanceof DeploymentStoppedSignal) return;
    await markFailed(deploymentId, err);
  } finally {
    runningJobs.delete(String(deploymentId));
  }
}

function startDeployment(deploymentId) {
  runningJobs.set(String(deploymentId), true);
  runOrchestrator(deploymentId).catch((err) => {
    console.error(`Unhandled deployment orchestrator error for ${deploymentId}:`, err);
  });
}

async function requestStop(deploymentId, userId) {
  const deployment = await Deployment.findOne({ _id: deploymentId, userId });
  if (!deployment) throw new DeploymentAgentError('Deployment not found.', 404);
  if (deployment.status !== 'running') {
    throw new DeploymentAgentError('This deployment is not currently running.', 400);
  }
  await Deployment.updateOne({ _id: deploymentId }, { $set: { status: 'stopping' } });
  if (!runningJobs.has(String(deploymentId))) {
    await rollbackDeployment(deploymentId);
  }
}

async function requestRollback(deploymentId, userId) {
  const deployment = await Deployment.findOne({ _id: deploymentId, userId });
  if (!deployment) throw new DeploymentAgentError('Deployment not found.', 404);
  if (deployment.status !== 'failed') {
    throw new DeploymentAgentError('Rollback is only available for failed deployments.', 400);
  }
  await rollbackDeployment(deploymentId);
}

/**
 * Post-success capability: update a single deployed component's env vars and
 * redeploy it. Runs in the background; deployment.status stays 'succeeded'
 * throughout - progress is reported via a dedicated, dynamically-added step.
 */
async function updateComponentEnvVars(deploymentId, componentName, envVars) {
  const stepKey = `env-update:${componentName}:${Date.now()}`;
  try {
    await Deployment.updateOne(
      { _id: deploymentId },
      { $push: { steps: { key: stepKey, label: `Update env vars for ${componentName}`, status: 'running', startedAt: new Date(), logs: [] } } }
    );
    const deployment = await Deployment.findById(deploymentId).lean();
    const resource = (deployment.resources || []).find((r) => r.componentName === componentName);
    if (!resource) throw new DeploymentAgentError(`No deployed resource named "${componentName}" was found.`, 404);
    const { apiKey, metadata } = await credentialService.getDecryptedKey(deployment.userId, resource.platform);
    const cred = { apiKey, metadata };

    if (resource.platform === 'render') {
      await renderApiService.updateEnvVars(apiKey, resource.platformResourceId, envVars);
      const redeploy = await renderApiService.triggerDeploy(apiKey, resource.platformResourceId);
      await pollRenderDeploy(deploymentId, stepKey, cred, resource, redeploy.id);
    } else {
      await vercelApiService.createEnvVars(
        apiKey,
        resource.platformResourceId,
        envVars.map((v) => ({ key: v.key, value: v.value, type: 'encrypted', target: ['production'] })),
        { teamId: metadata.teamId }
      );
      const [org, repo] = deployment.repoFullName.split('/');
      const redeploy = await vercelApiService.createDeployment(
        apiKey,
        { name: resource.resourceName, project: resource.platformResourceId, target: 'production', gitSource: { type: 'github', ref: 'main', org, repo } },
        { teamId: metadata.teamId }
      );
      const finalDep = await pollVercelDeployment(deploymentId, stepKey, cred, redeploy.id);
      const liveUrl = finalDep.url ? `https://${finalDep.url}` : resource.liveUrl;
      await Deployment.updateOne(
        { _id: deploymentId, 'resources.componentName': componentName },
        { $set: { 'resources.$.liveUrl': liveUrl } }
      );
    }
    await updateStep(deploymentId, stepKey, { status: 'success', finishedAt: new Date(), message: 'Environment variables updated and redeployed.' });
  } catch (err) {
    if (err instanceof DeploymentStoppedSignal) return;
    await updateStep(deploymentId, stepKey, { status: 'failed', finishedAt: new Date(), message: err.message });
  }
}

module.exports = {
  DeploymentAgentError,
  buildDeploymentPlan,
  buildInitialSteps,
  startDeployment,
  requestStop,
  requestRollback,
  updateComponentEnvVars,
};
