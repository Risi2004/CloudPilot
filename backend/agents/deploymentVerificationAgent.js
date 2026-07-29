const { LlmAgent, InMemoryRunner, isFinalResponse, stringifyContent } = require('@google/adk');
const { RunpodModel } = require('../adk/runpodModel');
const DeploymentVerification = require('../models/DeploymentVerification');
const Deployment = require('../models/Deployment');
const credentialService = require('../services/credentialService');
const renderApiService = require('../services/renderApiService');
const vercelApiService = require('../services/vercelApiService');
const checks = require('../services/verificationCheckService');

class DeploymentVerificationError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

class VerificationStoppedSignal extends Error {}

const runningJobs = new Map();
const POLL_INTERVAL_MS = 4000;
const REDEPLOY_TIMEOUT_MS = 6 * 60 * 1000;

const FRONTEND_KEYWORDS = /frontend|client|web(?!hook)|ui\b|static/i;
const BACKEND_KEYWORDS = /backend|server|api|worker/i;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// LLM #1: infer the auth test plan from candidate auth-related source files.
// ---------------------------------------------------------------------------

const TEST_PLAN_INSTRUCTION = `You are the Deployment Verification Agent inside CloudPilot, an autonomous cloud deployment assistant.

A repository has been analyzed and deployed. Your job right now is narrow: read the provided source file excerpts (chosen because they likely contain authentication routes) and infer the REAL registration endpoint, login endpoint, a protected endpoint, and (if one exists) an account-deletion endpoint for this specific app, so CloudPilot can verify the live deployment actually works end-to-end using a disposable test account.

Ground everything in the actual code you're shown - do not invent a path, field name, or response shape that isn't evidenced by the source. If you cannot find clear evidence for something, set its "enabled" field to false rather than guessing.

Respond with a single JSON object and NOTHING else - no markdown code fences, no prose before or after. Use EXACTLY this shape:

{
  "registration": {
    "enabled": true or false,
    "path": "string, e.g. '/api/auth/register'",
    "method": "POST",
    "fields": { "email": "string - the request body field name for email", "password": "string - the request body field name for password", "extra": { "anyOtherRequiredField": "a plausible test value" } }
  },
  "login": {
    "enabled": true or false,
    "path": "string, e.g. '/api/auth/login'",
    "method": "POST",
    "fields": { "email": "string", "password": "string" },
    "tokenField": "string or null - dot-path to the auth token in the JSON response body, e.g. 'token' or 'data.accessToken', or null if auth is cookie-based instead"
  },
  "protectedRoute": {
    "enabled": true or false,
    "path": "string - a real endpoint from the code that requires authentication, e.g. '/api/users/me'",
    "method": "GET",
    "authMethod": "bearer" or "cookie"
  },
  "deleteAccount": {
    "enabled": true or false,
    "path": "string or null - a real endpoint that deletes the authenticated user's own account, if one clearly exists in the code",
    "method": "DELETE",
    "authMethod": "bearer" or "cookie"
  }
}`;

// ---------------------------------------------------------------------------
// LLM #2: given failed checks + current config, propose specific env var
// fixes. Config-only - never touches source code.
// ---------------------------------------------------------------------------

const CONFIG_FIX_INSTRUCTION = `You are the Deployment Verification Agent inside CloudPilot, an autonomous cloud deployment assistant.

Some post-deployment checks failed on a live Render/Vercel deployment. Your job is narrow: propose SPECIFIC environment-variable changes (on the already-deployed services) that would plausibly fix these specific failures. You may ONLY propose environment variable changes - never source code, never anything else. If a failing check is not something an environment variable change could plausibly fix (e.g. an application bug in registration logic, total unreachability, unrelated to any known env var), do not propose a fix for it - it will be reported to the developer as needing manual attention instead.

Common real fixes: setting a CORS/allowed-origin env var to the frontend's actual live URL; correcting an API-base-URL env var that still points at localhost to the backend's actual live URL; adding a genuinely missing required environment variable if its correct value can be confidently inferred from context (e.g. the other service's own live URL).

Respond with a single JSON object and NOTHING else:

{
  "fixes": [
    { "componentName": "string - must exactly match one of the component names given to you", "key": "string - the env var key to set", "newValue": "string", "reason": "string - one short sentence explaining why this should fix a specific failing check" }
  ]
}

If no confident config-only fix exists for any of the failures, respond with {"fixes": []}.`;

let testPlanAgent = null;
let testPlanRunner = null;
let configFixAgent = null;
let configFixRunner = null;

function getRunpodConfig() {
  const baseUrl = process.env.RUNPOD_BASE_URL;
  const apiKey = process.env.RUNPOD_API_KEY;
  const model = process.env.RUNPOD_MODEL || 'qwen3:14b';
  if (!baseUrl || !apiKey) {
    throw new DeploymentVerificationError(
      'RunPod is not configured. Set RUNPOD_BASE_URL and RUNPOD_API_KEY in the backend environment.'
    );
  }
  return { baseUrl, apiKey, model };
}

function getTestPlanRunner() {
  if (testPlanRunner) return testPlanRunner;
  const { baseUrl, apiKey, model } = getRunpodConfig();
  // This call has to read several full source file excerpts as context, so
  // it needs much more headroom than the shared 4096-token default - too
  // little and the model's response gets cut off (or is left with no room to
  // answer at all after "thinking"), which surfaces as "did not return a
  // response" rather than a clean error.
  const maxTokens = Number(process.env.RUNPOD_MAX_TOKENS_VERIFICATION_TESTPLAN) || 12000;
  const runpodModel = new RunpodModel({ model, baseUrl, apiKey, maxTokens });
  testPlanAgent = new LlmAgent({ name: 'deployment_verification_test_plan_agent', model: runpodModel, instruction: TEST_PLAN_INSTRUCTION });
  testPlanRunner = new InMemoryRunner({ agent: testPlanAgent, appName: 'cloudpilot-verification-test-plan' });
  return testPlanRunner;
}

function getConfigFixRunner() {
  if (configFixRunner) return configFixRunner;
  const { baseUrl, apiKey, model } = getRunpodConfig();
  const maxTokens = Number(process.env.RUNPOD_MAX_TOKENS_VERIFICATION_FIX) || 6144;
  const runpodModel = new RunpodModel({ model, baseUrl, apiKey, maxTokens });
  configFixAgent = new LlmAgent({ name: 'deployment_verification_config_fix_agent', model: runpodModel, instruction: CONFIG_FIX_INSTRUCTION });
  configFixRunner = new InMemoryRunner({ agent: configFixAgent, appName: 'cloudpilot-verification-config-fix' });
  return configFixRunner;
}

function cleanJsonString(str) {
  let cleaned = str.replace(/\/\*[\s\S]*?\*\//g, '');
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  return cleaned.trim();
}

function extractJson(rawText) {
  let text = rawText.trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) text = fenceMatch[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new DeploymentVerificationError('Deployment Verification Agent returned invalid JSON: no JSON object found.');
  }
  try {
    return JSON.parse(cleanJsonString(text.slice(start, end + 1)));
  } catch (err) {
    throw new DeploymentVerificationError(`Deployment Verification Agent returned invalid JSON: ${err.message}`);
  }
}

async function runLlmOnce(runner, message) {
  let finalText = '';
  for await (const event of runner.runEphemeral({ userId: 'cloudpilot-system', newMessage: { role: 'user', parts: [{ text: message }] } })) {
    if (isFinalResponse(event)) finalText = stringifyContent(event);
  }
  if (!finalText) throw new DeploymentVerificationError('Deployment Verification Agent did not return a response.');
  return extractJson(finalText);
}

const MAX_LLM_ATTEMPTS = 3;

// An empty or malformed response is a transient, non-deterministic failure
// mode for this model (especially on a large-context call like the test plan
// inference), not a permanent one - retrying the same request often succeeds
// on the next sample, exactly like the Architecture Generation Agent's fix
// for the same class of issue.
async function runLlm(runner, message) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_LLM_ATTEMPTS; attempt += 1) {
    try {
      return await runLlmOnce(runner, message);
    } catch (err) {
      lastErr = err;
      if (!(err instanceof DeploymentVerificationError) || attempt === MAX_LLM_ATTEMPTS) throw err;
      console.warn(`Deployment Verification Agent LLM call attempt ${attempt} failed (${err.message}), retrying...`);
    }
  }
  throw lastErr;
}

function defaultTestPlanSection() {
  return { enabled: false, path: null, method: 'POST', fields: {} };
}

function normalizeTestPlan(raw) {
  const plan = raw || {};
  return {
    registration: { ...defaultTestPlanSection(), ...(plan.registration || {}) },
    login: { ...defaultTestPlanSection(), tokenField: null, ...(plan.login || {}) },
    protectedRoute: { enabled: false, path: null, method: 'GET', authMethod: 'bearer', ...(plan.protectedRoute || {}) },
    deleteAccount: { enabled: false, path: null, method: 'DELETE', authMethod: 'bearer', ...(plan.deleteAccount || {}) },
  };
}

async function inferTestPlan({ analysisResult, candidateFiles }) {
  const runner = getTestPlanRunner();
  const result = analysisResult || {};
  const fileBlock = (candidateFiles || [])
    .map((f) => `--- FILE: ${f.path} ---\n${f.content}`)
    .join('\n\n');

  const message = [
    `Language: ${result.language || 'Unknown'}`,
    `Framework: ${result.framework || 'Unknown'}`,
    '',
    '--- CANDIDATE SOURCE FILES (files likely to define auth routes) ---',
    fileBlock || '(none found)',
    '',
    // Qwen3's documented soft-switch to skip its extended chain-of-thought
    // phase. This task is careful reading + reformatting, not multi-step
    // reasoning - on a large-context prompt like this one, unrestricted
    // "thinking" can consume the entire token budget before the model ever
    // writes the actual JSON answer, which surfaces as an empty response.
    '/no_think',
  ].join('\n');

  const parsed = await runLlm(runner, message);
  return normalizeTestPlan(parsed);
}

async function proposeConfigFixes({ failedChecks, componentNames, envVarsByComponent }) {
  const runner = getConfigFixRunner();
  const message = [
    '--- FAILED CHECKS ---',
    JSON.stringify(failedChecks, null, 2),
    '',
    '--- KNOWN COMPONENT NAMES ---',
    componentNames.join(', '),
    '',
    '--- CURRENT ENVIRONMENT VARIABLES PER COMPONENT (values may be hidden if encrypted) ---',
    JSON.stringify(envVarsByComponent, null, 2),
    '',
    '/no_think',
  ].join('\n');

  const parsed = await runLlm(runner, message);
  const fixes = Array.isArray(parsed.fixes) ? parsed.fixes : [];
  return fixes.filter((f) => f && componentNames.includes(f.componentName) && f.key);
}

// ---------------------------------------------------------------------------
// Check plan / definitions
// ---------------------------------------------------------------------------

function buildInitialChecks(testPlan) {
  const list = [
    { id: 'frontend_reachable', title: 'Frontend URL is reachable', fixable: false },
    { id: 'backend_reachable', title: 'Backend URL is reachable', fixable: false },
    { id: 'https_used', title: 'HTTPS is used', fixable: false },
    { id: 'backend_health', title: 'Backend health endpoint responds', fixable: false },
    { id: 'cors_configured', title: 'CORS is configured correctly', fixable: true },
    { id: 'frontend_backend_communication', title: 'Frontend can communicate with backend', fixable: true },
    { id: 'env_vars_present', title: 'Environment variables are present', fixable: true },
    { id: 'no_localhost_urls', title: 'API URLs do not point to localhost', fixable: true },
    { id: 'database_connection', title: 'Database connection works', fixable: false },
  ];

  if (testPlan.registration.enabled) list.push({ id: 'registration_works', title: 'Registration works', fixable: true });
  if (testPlan.login.enabled) {
    list.push({ id: 'login_works', title: 'Login works', fixable: true });
    list.push({ id: 'auth_token_created', title: 'Authentication cookie or token is created', fixable: false });
  }
  if (testPlan.protectedRoute.enabled) list.push({ id: 'protected_routes_accessible', title: 'Protected routes are accessible', fixable: true });

  return list.map((c) => ({ ...c, status: 'pending', message: '' }));
}

function findComponentResource(resources, keywordRegex, excludeResource) {
  return (
    resources.find((r) => r !== excludeResource && keywordRegex.test(r.componentName)) ||
    null
  );
}

function identifyFrontendAndBackend(resources) {
  let frontend = findComponentResource(resources, FRONTEND_KEYWORDS, null) || resources.find((r) => r.platform === 'vercel');
  let backend = findComponentResource(resources, BACKEND_KEYWORDS, frontend) || resources.find((r) => r.platform === 'render' && r !== frontend);
  if (!frontend) frontend = resources[0];
  if (!backend) backend = resources.find((r) => r !== frontend) || resources[0];
  return { frontend, backend };
}

async function fetchCurrentEnvVars(resource, cred) {
  try {
    if (resource.platform === 'render') {
      return await renderApiService.listEnvVars(cred.apiKey, resource.platformResourceId);
    }
    return await vercelApiService.listEnvVars(cred.apiKey, resource.platformResourceId, { teamId: cred.metadata.teamId });
  } catch (err) {
    return [];
  }
}

async function runAllChecks({ testPlan, deploymentPlanComponents, resources, creds }) {
  const results = {};
  const { frontend, backend } = identifyFrontendAndBackend(resources);

  results.frontend_reachable = await checks.checkReachable(frontend && frontend.liveUrl);
  results.backend_reachable = await checks.checkReachable(backend && backend.liveUrl);

  const httpsFrontend = checks.checkHttps(frontend && frontend.liveUrl);
  const httpsBackend = checks.checkHttps(backend && backend.liveUrl);
  results.https_used =
    httpsFrontend.status === 'pass' && httpsBackend.status === 'pass'
      ? { status: 'pass', message: 'Both frontend and backend use HTTPS.' }
      : { status: 'fail', message: [httpsFrontend, httpsBackend].filter((r) => r.status !== 'pass').map((r) => r.message).join(' ') };

  results.backend_health = await checks.checkHealthEndpoint(backend && backend.liveUrl);

  const corsResult = await checks.checkCors(backend && backend.liveUrl, frontend && frontend.liveUrl);
  results.cors_configured = corsResult;
  results.frontend_backend_communication =
    corsResult.status === 'pass' && results.backend_reachable.status === 'pass'
      ? { status: 'pass', message: 'Backend is reachable from the frontend origin.' }
      : { status: 'fail', message: 'The backend did not respond successfully to a request from the frontend origin.' };

  const envVarsByComponent = {};
  for (const resource of resources) {
    const cred = creds[resource.platform];
    envVarsByComponent[resource.componentName] = cred ? await fetchCurrentEnvVars(resource, cred) : [];
  }

  const expectedByComponent = {};
  (deploymentPlanComponents || []).forEach((c) => {
    expectedByComponent[c.name] = (c.envVars || []).filter((v) => v.included !== false).map((v) => v.key);
  });

  const presentResults = resources.map((r) => checks.checkEnvVarsPresent(expectedByComponent[r.componentName], envVarsByComponent[r.componentName]));
  const missingMessages = presentResults.filter((r) => r.status === 'fail').map((r) => r.message);
  results.env_vars_present = missingMessages.length
    ? { status: 'fail', message: missingMessages.join(' ') }
    : { status: 'pass', message: 'All expected environment variables are present on every deployed component.' };

  const localhostResults = resources.map((r) => checks.checkNoLocalhostValues(envVarsByComponent[r.componentName]));
  const localhostMessages = localhostResults.filter((r) => r.status === 'fail').map((r) => r.message);
  results.no_localhost_urls = localhostMessages.length
    ? { status: 'fail', message: localhostMessages.join(' ') }
    : { status: 'pass', message: 'No environment variable values point at localhost on any deployed component.' };

  let loginResult = null;
  let testEmail = null;

  if (testPlan.registration.enabled || testPlan.login.enabled) {
    testEmail = checks.generateTestEmail();
    const testPassword = 'CloudPilot-Verify-1!';

    if (testPlan.registration.enabled) {
      results.registration_works = await checks.checkRegistration(backend && backend.liveUrl, testPlan, testEmail, testPassword);
    }
    results.database_connection =
      results.registration_works && results.registration_works.status === 'pass'
        ? { status: 'pass', message: 'Registration succeeded, which requires a working database write.' }
        : { status: 'skipped', message: 'Could not verify database connectivity directly (registration check was disabled or did not pass).' };

    if (testPlan.login.enabled) {
      loginResult = await checks.checkLogin(backend && backend.liveUrl, testPlan, testEmail, testPassword);
      results.login_works = { status: loginResult.status, message: loginResult.message };
      results.auth_token_created = checks.checkAuthTokenOrCookie(testPlan, loginResult);
    }

    if (testPlan.protectedRoute.enabled) {
      results.protected_routes_accessible = await checks.checkProtectedRoute(backend && backend.liveUrl, testPlan, loginResult);
    }
  } else {
    results.database_connection = { status: 'skipped', message: 'Could not verify database connectivity directly (no account-based checks were enabled).' };
  }

  let cleanup = null;
  if (loginResult && loginResult.status === 'pass') {
    cleanup = await checks.attemptTestAccountCleanup(backend && backend.liveUrl, testPlan, loginResult);
  }

  return { results, envVarsByComponent, testEmail, cleanup };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

async function updateVerification(verificationId, patch) {
  await DeploymentVerification.updateOne({ _id: verificationId }, { $set: patch });
}

async function checkStopOrThrow(verificationId) {
  const doc = await DeploymentVerification.findById(verificationId).select('status').lean();
  if (doc && doc.status === 'stopping') {
    await updateVerification(verificationId, { status: 'stopped' });
    throw new VerificationStoppedSignal();
  }
}

async function applyFixAndRedeploy(resource, cred, fix, repoFullName) {
  if (resource.platform === 'render') {
    const current = await renderApiService.listEnvVars(cred.apiKey, resource.platformResourceId);
    const merged = current.filter((v) => v.key !== fix.key).map((v) => ({ key: v.key, value: v.value }));
    merged.push({ key: fix.key, value: fix.newValue });
    await renderApiService.updateEnvVars(cred.apiKey, resource.platformResourceId, merged);
    const redeploy = await renderApiService.triggerDeploy(cred.apiKey, resource.platformResourceId);

    const deadline = Date.now() + REDEPLOY_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const deploy = await renderApiService.getDeploy(cred.apiKey, resource.platformResourceId, redeploy.id);
      if (renderApiService.RENDER_DEPLOY_TERMINAL_SUCCESS.has(deploy.status)) return { ok: true };
      if (renderApiService.RENDER_DEPLOY_TERMINAL_FAILURE.has(deploy.status)) {
        return { ok: false, message: `Redeploy ended with status "${deploy.status}".` };
      }
      await sleep(POLL_INTERVAL_MS);
    }
    return { ok: false, message: 'Timed out waiting for the redeploy to go live.' };
  }

  await vercelApiService.createEnvVars(
    cred.apiKey,
    resource.platformResourceId,
    [{ key: fix.key, value: fix.newValue, type: 'encrypted', target: ['production'] }],
    { teamId: cred.metadata.teamId }
  );
  const [org, repo] = (repoFullName || '').split('/');
  const redeploy = await vercelApiService.createDeployment(
    cred.apiKey,
    { name: resource.resourceName, project: resource.platformResourceId, target: 'production', gitSource: { type: 'github', ref: 'main', org, repo } },
    { teamId: cred.metadata.teamId }
  );

  const deadline = Date.now() + REDEPLOY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const polled = await vercelApiService.getDeployment(cred.apiKey, redeploy.id, { teamId: cred.metadata.teamId });
    if (vercelApiService.VERCEL_DEPLOY_TERMINAL_SUCCESS.has(polled.readyState)) return { ok: true };
    if (vercelApiService.VERCEL_DEPLOY_TERMINAL_FAILURE.has(polled.readyState)) {
      return { ok: false, message: `Redeploy ended with state "${polled.readyState}".` };
    }
    await sleep(POLL_INTERVAL_MS);
  }
  return { ok: false, message: 'Timed out waiting for the redeploy to become ready.' };
}

async function runOrchestrator(verificationId) {
  try {
    const verification = await DeploymentVerification.findById(verificationId).lean();
    if (!verification) return;

    const deployment = await Deployment.findById(verification.deploymentId).lean();
    if (!deployment) throw new DeploymentVerificationError('The original deployment could not be found.', 404);

    const resources = deployment.resources || [];
    const deploymentPlanComponents = (deployment.plan && deployment.plan.components) || [];
    const platforms = [...new Set(resources.map((r) => r.platform))];
    const creds = {};
    for (const platform of platforms) {
      creds[platform] = await credentialService.getDecryptedKey(deployment.userId, platform);
    }

    const testPlan = normalizeTestPlan(verification.testPlan);
    let attempt = 0;

    while (attempt < verification.maxAttempts) {
      attempt += 1;
      await checkStopOrThrow(verificationId);

      const startedAt = new Date();
      const { results, testEmail, cleanup } = await runAllChecks({ testPlan, deploymentPlanComponents, resources, creds });

      const checkList = buildInitialChecks(testPlan).map((c) => ({
        ...c,
        status: (results[c.id] && results[c.id].status) || 'skipped',
        message: (results[c.id] && results[c.id].message) || '',
      }));

      const failedFixable = checkList.filter((c) => c.status === 'fail' && c.fixable);
      const allPassed = checkList.every((c) => c.status === 'pass' || c.status === 'skipped');

      const patch = { attempt, checks: checkList };
      if (testEmail) patch['testAccount.email'] = testEmail;
      if (cleanup) {
        patch['testAccount.cleanupAttempted'] = cleanup.attempted;
        patch['testAccount.cleanedUp'] = cleanup.cleanedUp;
      }
      await updateVerification(verificationId, patch);

      let appliedFixes = [];
      if (!allPassed && failedFixable.length && attempt < verification.maxAttempts) {
        await checkStopOrThrow(verificationId);
        try {
          const componentNames = resources.map((r) => r.componentName);
          const envVarsByComponent = {};
          for (const resource of resources) {
            const cred = creds[resource.platform];
            envVarsByComponent[resource.componentName] = cred ? await fetchCurrentEnvVars(resource, cred) : [];
          }
          const fixes = await proposeConfigFixes({
            failedChecks: failedFixable.map((c) => ({ id: c.id, title: c.title, message: c.message })),
            componentNames,
            envVarsByComponent,
          });

          for (const fix of fixes) {
            await checkStopOrThrow(verificationId);
            const resource = resources.find((r) => r.componentName === fix.componentName);
            const cred = resource && creds[resource.platform];
            if (!resource || !cred) continue;
            const outcome = await applyFixAndRedeploy(resource, cred, fix, deployment.repoFullName);
            if (outcome.ok) appliedFixes.push({ componentName: fix.componentName, key: fix.key, newValue: fix.newValue, reason: fix.reason });
          }
        } catch (err) {
          console.error(`Verification ${verificationId} config-fix attempt failed (non-fatal):`, err.message);
        }
      }

      await DeploymentVerification.updateOne(
        { _id: verificationId },
        { $push: { attemptHistory: { attemptNumber: attempt, checks: checkList, appliedFixes, startedAt, finishedAt: new Date() } } }
      );

      if (allPassed) {
        await updateVerification(verificationId, {
          status: 'succeeded',
          finalReport: { summary: 'All verification checks passed.', unresolved: [] },
        });
        return;
      }

      if (!appliedFixes.length || attempt >= verification.maxAttempts) {
        const unresolved = checkList
          .filter((c) => c.status === 'fail')
          .map((c) => ({
            id: c.id,
            title: c.title,
            reason: c.fixable
              ? `${c.message} No confident configuration-only fix was found or applied for this after ${attempt} attempt(s) - this may require a source code change.`
              : `${c.message} This is not something a configuration change can fix.`,
          }));
        await updateVerification(verificationId, {
          status: 'failed',
          finalReport: {
            summary: `${unresolved.length} check(s) still failing after ${attempt} attempt(s).`,
            unresolved,
          },
        });
        return;
      }
    }
  } catch (err) {
    if (err instanceof VerificationStoppedSignal) return;
    console.error(`Deployment verification ${verificationId} failed:`, err);
    await DeploymentVerification.updateOne(
      { _id: verificationId, status: { $in: ['running', 'stopping'] } },
      { $set: { status: 'failed', finalReport: { summary: `Verification stopped due to an error: ${err.message}`, unresolved: [] } } }
    );
  } finally {
    runningJobs.delete(String(verificationId));
  }
}

function startVerification(verificationId) {
  runningJobs.set(String(verificationId), true);
  runOrchestrator(verificationId).catch((err) => {
    console.error(`Unhandled verification orchestrator error for ${verificationId}:`, err);
  });
}

async function requestStop(verificationId, userId) {
  const verification = await DeploymentVerification.findOne({ _id: verificationId, userId });
  if (!verification) throw new DeploymentVerificationError('Verification not found.', 404);
  if (verification.status !== 'running') {
    throw new DeploymentVerificationError('This verification is not currently running.', 400);
  }
  await DeploymentVerification.updateOne({ _id: verificationId }, { $set: { status: 'stopping' } });
  if (!runningJobs.has(String(verificationId))) {
    await DeploymentVerification.updateOne({ _id: verificationId }, { $set: { status: 'stopped' } });
  }
}

module.exports = {
  DeploymentVerificationError,
  inferTestPlan,
  normalizeTestPlan,
  buildInitialChecks,
  startVerification,
  requestStop,
};
