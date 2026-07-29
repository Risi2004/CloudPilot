const { LlmAgent, InMemoryRunner, isFinalResponse, stringifyContent } = require('@google/adk');
const { RunpodModel } = require('../adk/runpodModel');
const DeploymentTroubleshooting = require('../models/DeploymentTroubleshooting');
const Deployment = require('../models/Deployment');
const Analysis = require('../models/Analysis');
const credentialService = require('../services/credentialService');
const renderApiService = require('../services/renderApiService');
const vercelApiService = require('../services/vercelApiService');
const githubFileService = require('../services/githubFileService');
const errorKnowledgeService = require('../services/errorKnowledgeService');

class DeploymentTroubleshootingError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

class TroubleshootingStoppedSignal extends Error {}

const runningJobs = new Map();
const POLL_INTERVAL_MS = 4000;
const REDEPLOY_TIMEOUT_MS = 6 * 60 * 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Log gathering + cheap (non-LLM) error signature extraction.
// ---------------------------------------------------------------------------

const MAX_LOG_LINES = 120;
const MAX_LOG_CHARS = 4000;

function gatherFailureLogs(deployment) {
  const lines = [];
  for (const step of deployment.steps || []) {
    if (step.status === 'failed' && Array.isArray(step.logs)) {
      lines.push(`--- step: ${step.label} ---`);
      lines.push(...step.logs);
      if (step.message) lines.push(`(step error) ${step.message}`);
    }
  }
  if (deployment.error) lines.push(`(deployment error) ${deployment.error}`);

  const trimmed = lines.slice(-MAX_LOG_LINES);
  let text = trimmed.join('\n');
  if (text.length > MAX_LOG_CHARS) {
    text = text.slice(text.length - MAX_LOG_CHARS);
  }
  return text;
}

// Known error signature patterns, cheapest-possible classification pass run
// before any embedding/LLM call - lets the flow short-circuit for free when
// there's genuinely nothing that looks like a real error.
const SIGNATURE_PATTERNS = [
  { type: 'MODULE_NOT_FOUND', regex: /Cannot find module ['"]([^'"]+)['"]|MODULE_NOT_FOUND/i },
  { type: 'npm_install_failure', regex: /npm ERR!|ERESOLVE|EBADENGINE/i },
  { type: 'port_binding_mismatch', regex: /EADDRINUSE|address already in use/i },
  { type: 'missing_env_var', regex: /(is not defined|is required|missing).{0,40}(env|environment variable)/i },
  { type: 'db_connection_refused', regex: /ECONNREFUSED|connection (refused|timed out) .*(mongo|postgres|mysql|database)/i },
  { type: 'out_of_memory', regex: /JavaScript heap out of memory|out of memory|OOM/i },
  { type: 'native_module_build_failure', regex: /node-gyp|gyp ERR!/i },
  { type: 'python_module_not_found', regex: /ModuleNotFoundError: No module named/i },
  { type: 'docker_build_context_missing_file', regex: /COPY failed|file not found in build context/i },
  { type: 'syntax_error', regex: /SyntaxError/i },
  { type: 'health_check_failed', regex: /health check (failed|timed out)/i },
  { type: 'build_exit_code', regex: /exit(ed)? with (exit )?code (\d+)/i },
];

function extractErrorSignature(logsText) {
  if (!logsText) return { type: 'unknown', excerpt: '' };
  for (const { type, regex } of SIGNATURE_PATTERNS) {
    const match = logsText.match(regex);
    if (match) return { type, excerpt: match[0] };
  }
  // Fall back to any line containing a generic "error" keyword.
  const errorLine = logsText.split('\n').find((l) => /error/i.test(l));
  return { type: errorLine ? 'generic_error' : 'unknown', excerpt: errorLine || '' };
}

function hasRecognizableFailure(deployment, logsText) {
  return deployment.status === 'failed' && logsText.trim().length > 0;
}

// Container/build-path prefixes commonly seen in platform logs that aren't
// part of the actual repo-relative path.
const PATH_PREFIXES_TO_STRIP = [
  /^\/?opt\/render\/project\/src\//,
  /^\/?vercel\/path0\//,
  /^\/?usr\/src\/app\//,
  /^\/?app\//,
];

function normalizeRepoPath(path) {
  let p = String(path || '').trim();
  for (const prefix of PATH_PREFIXES_TO_STRIP) {
    p = p.replace(prefix, '');
  }
  return p.replace(/^\/+/, '');
}

// ---------------------------------------------------------------------------
// LLM #1: diagnose root cause from logs + KB matches.
// ---------------------------------------------------------------------------

const DIAGNOSIS_INSTRUCTION = `You are the Deployment Troubleshooting Agent inside CloudPilot, an autonomous cloud deployment assistant.

A deployment just failed. Your job is to read the provided failure logs (truncated to the most relevant portion), a cheap regex-derived error signature, any related known error patterns retrieved from a knowledge base, and the repo's language/framework, then diagnose the root cause.

Ground your diagnosis strictly in the actual log text you are shown - do not invent details, file names, or causes not evidenced by the logs. If you are not confident, set confidence low and category to "unknown" rather than guessing.

Respond with a single JSON object and NOTHING else - no markdown code fences, no prose before or after. Use EXACTLY this shape:

{
  "rootCause": "one sentence - the specific underlying cause",
  "explanation": "2-4 sentences explaining the reasoning in plain language for a developer",
  "category": "env" or "code" or "infra" or "unknown",
  "confidence": a number from 0 to 1,
  "envFixes": [ { "componentName": "string - must exactly match one of the given component names", "key": "string - the env var key", "newValue": "string", "reason": "string" } ],
  "filesLikelyInvolved": ["relative/path/to/file.js"],
  "needsCodeChange": true or false
}

Rules:
- Use category "env" ONLY when the fix is purely an environment-variable change (missing or wrong value). Populate "envFixes" and leave "filesLikelyInvolved" empty.
- Use category "code" when a source code change is required. Set "needsCodeChange" true and list the specific repo-relative file path(s) implicated by the logs/stack trace in "filesLikelyInvolved" - only paths actually evidenced by the logs, except for well-known cases like package.json for a missing dependency.
- Use category "infra" for platform/infrastructure issues not fixable by env vars or code (out of memory, platform outage, missing external service).
- Use category "unknown" if the logs do not contain enough information to determine a cause.
- "envFixes" and "filesLikelyInvolved" are mutually exclusive - populate only the one matching "category".
- If category is not "env", respond with "envFixes": [].
- If category is not "code", respond with "filesLikelyInvolved": [] and "needsCodeChange": false.`;

// ---------------------------------------------------------------------------
// LLM #2: given diagnosis + actual file content, generate the fix. Only
// invoked lazily when the user picks Auto-Fix on a code-category diagnosis.
// ---------------------------------------------------------------------------

const CODE_FIX_INSTRUCTION = `You are the Deployment Troubleshooting Agent inside CloudPilot, an autonomous cloud deployment assistant.

A deployment failed and you already diagnosed the root cause. Your job now is narrow: given that diagnosis and the FULL current content of the implicated file(s), produce the exact corrected file content(s) that would plausibly fix this specific failure. Make the smallest change that fixes the diagnosed problem - do not refactor, reformat, rename things, or change unrelated code.

Respond with a single JSON object and NOTHING else:

{
  "files": [ { "path": "string - must exactly match one of the given file paths", "newContent": "string - the FULL corrected file content, not a diff" } ],
  "commitMessage": "string - a short conventional commit message describing the fix",
  "explanation": "string - one or two sentences describing exactly what changed and why"
}`;

let diagnosisAgent = null;
let diagnosisRunner = null;
let codeFixAgent = null;
let codeFixRunner = null;

function getRunpodConfig() {
  const baseUrl = process.env.RUNPOD_BASE_URL;
  const apiKey = process.env.RUNPOD_API_KEY;
  const model = process.env.RUNPOD_MODEL || 'qwen3:14b';
  if (!baseUrl || !apiKey) {
    throw new DeploymentTroubleshootingError(
      'RunPod is not configured. Set RUNPOD_BASE_URL and RUNPOD_API_KEY in the backend environment.'
    );
  }
  return { baseUrl, apiKey, model };
}

function getDiagnosisRunner() {
  if (diagnosisRunner) return diagnosisRunner;
  const { baseUrl, apiKey, model } = getRunpodConfig();
  const maxTokens = Number(process.env.RUNPOD_MAX_TOKENS_TROUBLESHOOTING_DIAGNOSIS) || 4096;
  const runpodModel = new RunpodModel({ model, baseUrl, apiKey, maxTokens });
  diagnosisAgent = new LlmAgent({ name: 'deployment_troubleshooting_diagnosis_agent', model: runpodModel, instruction: DIAGNOSIS_INSTRUCTION });
  diagnosisRunner = new InMemoryRunner({ agent: diagnosisAgent, appName: 'cloudpilot-troubleshooting-diagnosis' });
  return diagnosisRunner;
}

function getCodeFixRunner() {
  if (codeFixRunner) return codeFixRunner;
  const { baseUrl, apiKey, model } = getRunpodConfig();
  // Output can include full corrected file content, so this needs more
  // headroom than the diagnosis call's short structured answer.
  const maxTokens = Number(process.env.RUNPOD_MAX_TOKENS_TROUBLESHOOTING_FIX) || 8192;
  const runpodModel = new RunpodModel({ model, baseUrl, apiKey, maxTokens });
  codeFixAgent = new LlmAgent({ name: 'deployment_troubleshooting_code_fix_agent', model: runpodModel, instruction: CODE_FIX_INSTRUCTION });
  codeFixRunner = new InMemoryRunner({ agent: codeFixAgent, appName: 'cloudpilot-troubleshooting-code-fix' });
  return codeFixRunner;
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
    throw new DeploymentTroubleshootingError('Troubleshooting Agent returned invalid JSON: no JSON object found.');
  }
  try {
    return JSON.parse(cleanJsonString(text.slice(start, end + 1)));
  } catch (err) {
    throw new DeploymentTroubleshootingError(`Troubleshooting Agent returned invalid JSON: ${err.message}`);
  }
}

async function runLlmOnce(runner, message) {
  let finalText = '';
  for await (const event of runner.runEphemeral({ userId: 'cloudpilot-system', newMessage: { role: 'user', parts: [{ text: message }] } })) {
    if (isFinalResponse(event)) finalText = stringifyContent(event);
  }
  if (!finalText) throw new DeploymentTroubleshootingError('Troubleshooting Agent did not return a response.');
  return extractJson(finalText);
}

const MAX_LLM_ATTEMPTS = 3;

async function runLlm(runner, message) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_LLM_ATTEMPTS; attempt += 1) {
    try {
      return await runLlmOnce(runner, message);
    } catch (err) {
      lastErr = err;
      if (!(err instanceof DeploymentTroubleshootingError) || attempt === MAX_LLM_ATTEMPTS) throw err;
      console.warn(`Troubleshooting Agent LLM call attempt ${attempt} failed (${err.message}), retrying...`);
    }
  }
  throw lastErr;
}

function normalizeDiagnosis(raw, signature, kbMatches) {
  const d = raw || {};
  const category = ['env', 'code', 'infra', 'unknown'].includes(d.category) ? d.category : 'unknown';
  return {
    errorSignature: signature.type,
    rootCause: d.rootCause || 'Unknown',
    explanation: d.explanation || '',
    category,
    confidence: typeof d.confidence === 'number' ? Math.max(0, Math.min(1, d.confidence)) : 0,
    envFixes: category === 'env' && Array.isArray(d.envFixes) ? d.envFixes.filter((f) => f && f.componentName && f.key) : [],
    codeFix: {
      files: category === 'code' && Array.isArray(d.filesLikelyInvolved)
        ? d.filesLikelyInvolved.map((p) => ({ path: normalizeRepoPath(p), reason: d.rootCause || '' }))
        : [],
      summary: category === 'code' ? d.rootCause || '' : '',
    },
    kbMatches,
  };
}

// ---------------------------------------------------------------------------
// Diagnose: the cheap, synchronous entry point (one embedding call + one LLM
// call, no polling) - called directly from the controller, not fire-and-forget.
// ---------------------------------------------------------------------------

async function diagnose({ deploymentId, userId }) {
  const deployment = await Deployment.findOne({ _id: deploymentId, userId }).lean();
  if (!deployment) throw new DeploymentTroubleshootingError('Deployment not found.', 404);

  const logsText = gatherFailureLogs(deployment);
  if (!hasRecognizableFailure(deployment, logsText)) {
    throw new DeploymentTroubleshootingError('No failed deployment logs were found to diagnose.', 400);
  }

  const signature = extractErrorSignature(logsText);
  const kbMatches = await errorKnowledgeService.retrieveErrorContext(`${signature.type} ${signature.excerpt}`.trim());

  const analysis = await Analysis.findOne({ userId, repoUrl: deployment.repoUrl }).lean().catch(() => null);
  const language = (analysis && analysis.result && analysis.result.language) || 'Unknown';
  const framework = (analysis && analysis.result && analysis.result.framework) || 'Unknown';
  const componentNames = (deployment.resources || []).map((r) => r.componentName);

  const message = [
    `Language: ${language}`,
    `Framework: ${framework}`,
    `Known component names: ${componentNames.join(', ') || '(none)'}`,
    `Regex-derived error signature: ${signature.type}${signature.excerpt ? ` ("${signature.excerpt}")` : ''}`,
    '',
    '--- FAILURE LOGS (truncated) ---',
    logsText,
    '',
    '--- RELATED KNOWN ERROR PATTERNS FROM KNOWLEDGE BASE ---',
    kbMatches.length ? kbMatches.map((m) => `[${m.label}] ${m.text}`).join('\n\n') : '(no matches found)',
    '',
    '/no_think',
  ].join('\n');

  const runner = getDiagnosisRunner();
  const parsed = await runLlm(runner, message);
  const diagnosisResult = normalizeDiagnosis(parsed, signature, kbMatches);

  const doc = await DeploymentTroubleshooting.create({
    userId,
    deploymentId: deployment._id,
    repoUrl: deployment.repoUrl,
    status: 'awaiting_user_choice',
    attempt: 0,
    diagnosis: diagnosisResult,
  });

  return doc;
}

// ---------------------------------------------------------------------------
// Generate code fix (LLM #2) - lazy, only called when the user clicks
// Auto-Fix on a category:"code" diagnosis.
// ---------------------------------------------------------------------------

const MAX_FIX_FILES = 3;
const MAX_FIX_CHARS_TOTAL = 15000;

async function generateCodeFix(troubleshootingId, userId, githubToken) {
  const doc = await DeploymentTroubleshooting.findOne({ _id: troubleshootingId, userId });
  if (!doc) throw new DeploymentTroubleshootingError('Troubleshooting session not found.', 404);
  if (!doc.diagnosis || doc.diagnosis.category !== 'code') {
    throw new DeploymentTroubleshootingError('This diagnosis does not indicate a code change is needed.', 400);
  }
  if (!githubToken) {
    throw new DeploymentTroubleshootingError('A GitHub token is required to read source files.', 401);
  }

  const filePaths = (doc.diagnosis.codeFix.files || []).map((f) => f.path).filter(Boolean).slice(0, MAX_FIX_FILES);
  if (!filePaths.length) {
    throw new DeploymentTroubleshootingError('The diagnosis did not identify any specific files to fix.', 400);
  }

  const fetchedFiles = [];
  let totalChars = 0;
  for (const path of filePaths) {
    if (totalChars >= MAX_FIX_CHARS_TOTAL) break;
    try {
      const { content } = await githubFileService.fetchFileContent(doc.repoUrl, path, githubToken);
      fetchedFiles.push({ path, content });
      totalChars += content.length;
    } catch (err) {
      console.warn(`Troubleshooting ${troubleshootingId}: could not fetch "${path}" (non-fatal): ${err.message}`);
    }
  }

  if (!fetchedFiles.length) {
    throw new DeploymentTroubleshootingError('Could not read any of the implicated files from GitHub.', 502);
  }

  const message = [
    `Root cause: ${doc.diagnosis.rootCause}`,
    `Explanation: ${doc.diagnosis.explanation}`,
    '',
    '--- CURRENT FILE CONTENTS ---',
    fetchedFiles.map((f) => `--- FILE: ${f.path} ---\n${f.content}`).join('\n\n'),
    '',
    '/no_think',
  ].join('\n');

  const runner = getCodeFixRunner();
  const parsed = await runLlm(runner, message);
  const fixedByPath = new Map((parsed.files || []).filter((f) => f && f.path).map((f) => [f.path, f.newContent || '']));

  const files = fetchedFiles
    .filter((f) => fixedByPath.has(f.path))
    .map((f) => ({ path: f.path, oldContent: f.content, newContent: fixedByPath.get(f.path) }));

  if (!files.length) {
    throw new DeploymentTroubleshootingError('The Troubleshooting Agent did not propose a usable fix for the implicated file(s).', 502);
  }

  doc.proposedFix = { files, commitMessage: parsed.commitMessage || `CloudPilot: fix ${doc.diagnosis.errorSignature}` };
  await doc.save();
  return doc;
}

// ---------------------------------------------------------------------------
// Resolve manually: no further LLM/network calls.
// ---------------------------------------------------------------------------

async function resolveManual(troubleshootingId, userId) {
  const doc = await DeploymentTroubleshooting.findOne({ _id: troubleshootingId, userId });
  if (!doc) throw new DeploymentTroubleshootingError('Troubleshooting session not found.', 404);
  doc.status = 'manual';
  doc.resolution = { summary: 'Diagnosis shown to the user for manual resolution.', unresolvedReason: '' };
  await doc.save();
  return doc;
}

// ---------------------------------------------------------------------------
// Apply fix + redeploy + poll to terminal.
// ---------------------------------------------------------------------------

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

async function redeployResourceAndWait(resource, cred, repoFullName) {
  if (resource.platform === 'render') {
    const redeploy = await renderApiService.triggerDeploy(cred.apiKey, resource.platformResourceId);
    const deadline = Date.now() + REDEPLOY_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const deploy = await renderApiService.getDeploy(cred.apiKey, resource.platformResourceId, redeploy.id);
      if (renderApiService.RENDER_DEPLOY_TERMINAL_SUCCESS.has(deploy.status)) return { ok: true, deployId: redeploy.id };
      if (renderApiService.RENDER_DEPLOY_TERMINAL_FAILURE.has(deploy.status)) {
        return { ok: false, message: `Redeploy of ${resource.componentName} ended with status "${deploy.status}".`, deployId: redeploy.id };
      }
      await sleep(POLL_INTERVAL_MS);
    }
    return { ok: false, message: `Timed out waiting for ${resource.componentName}'s redeploy to go live.`, deployId: redeploy.id };
  }

  const [org, repo] = (repoFullName || '').split('/');
  const redeploy = await vercelApiService.createDeployment(
    cred.apiKey,
    { name: resource.resourceName, project: resource.platformResourceId, target: 'production', gitSource: { type: 'github', ref: 'main', org, repo } },
    { teamId: cred.metadata.teamId }
  );
  const deadline = Date.now() + REDEPLOY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const polled = await vercelApiService.getDeployment(cred.apiKey, redeploy.id, { teamId: cred.metadata.teamId });
    if (vercelApiService.VERCEL_DEPLOY_TERMINAL_SUCCESS.has(polled.readyState)) return { ok: true, deployId: redeploy.id };
    if (vercelApiService.VERCEL_DEPLOY_TERMINAL_FAILURE.has(polled.readyState)) {
      return { ok: false, message: `Redeploy of ${resource.componentName} ended with state "${polled.readyState}".`, deployId: redeploy.id };
    }
    await sleep(POLL_INTERVAL_MS);
  }
  return { ok: false, message: `Timed out waiting for ${resource.componentName}'s redeploy to become ready.`, deployId: redeploy.id };
}

async function fetchDeployFailureLogs(resource, cred, deployId) {
  try {
    if (resource.platform === 'render') {
      const { logs } = await renderApiService.listBuildLogs(cred.apiKey, {
        ownerId: cred.metadata.ownerId,
        resource: resource.platformResourceId,
        limit: 100,
      });
      return logs.map((l) => l.message || l.text || JSON.stringify(l)).join('\n');
    }
    const events = await vercelApiService.getDeploymentEvents(cred.apiKey, deployId, { teamId: cred.metadata.teamId, limit: 100 });
    return events.map((e) => e.text || (e.payload && e.payload.text) || e.type).filter(Boolean).join('\n');
  } catch (err) {
    return '';
  }
}

async function applyEnvFixAndRedeploy(doc, deployment, creds) {
  const resources = deployment.resources || [];
  const touchedComponents = [...new Set((doc.diagnosis.envFixes || []).map((f) => f.componentName))];
  const results = [];

  for (const componentName of touchedComponents) {
    const resource = resources.find((r) => r.componentName === componentName);
    const cred = resource && creds[resource.platform];
    if (!resource || !cred) continue;

    const fixesForComponent = doc.diagnosis.envFixes.filter((f) => f.componentName === componentName);
    if (resource.platform === 'render') {
      const current = await fetchCurrentEnvVars(resource, cred);
      const keysToSet = new Set(fixesForComponent.map((f) => f.key));
      const merged = current.filter((v) => !keysToSet.has(v.key)).map((v) => ({ key: v.key, value: v.value }));
      fixesForComponent.forEach((f) => merged.push({ key: f.key, value: f.newValue }));
      await renderApiService.updateEnvVars(cred.apiKey, resource.platformResourceId, merged);
    } else {
      await vercelApiService.createEnvVars(
        cred.apiKey,
        resource.platformResourceId,
        fixesForComponent.map((f) => ({ key: f.key, value: f.newValue, type: 'encrypted', target: ['production'] })),
        { teamId: cred.metadata.teamId }
      );
    }

    const outcome = await redeployResourceAndWait(resource, cred, deployment.repoFullName);
    results.push({ resource, ...outcome });
  }

  if (!results.length) {
    return { ok: false, message: 'No matching deployed component was found for the proposed environment fix(es).', resources: [] };
  }
  const failed = results.filter((r) => !r.ok);
  return {
    ok: failed.length === 0,
    message: failed.length ? failed.map((f) => f.message).join(' ') : 'All affected components redeployed successfully.',
    resources: results,
  };
}

async function applyCodeFixAndRedeploy(doc, deployment, creds, githubToken) {
  if (!doc.proposedFix || !doc.proposedFix.files || !doc.proposedFix.files.length) {
    throw new DeploymentTroubleshootingError('No approved code fix is available to apply.', 400);
  }

  const commit = await githubFileService.commitFiles(
    deployment.repoUrl,
    {
      files: doc.proposedFix.files.map((f) => ({ path: f.path, content: f.newContent })),
      message: doc.proposedFix.commitMessage,
    },
    githubToken
  );

  // A source change could affect any deployed component in this monorepo/app,
  // so redeploy everything rather than trying to guess which resource owns
  // the changed path.
  const results = [];
  for (const resource of deployment.resources || []) {
    const cred = creds[resource.platform];
    if (!cred) continue;
    const outcome = await redeployResourceAndWait(resource, cred, deployment.repoFullName);
    results.push({ resource, ...outcome });
  }

  const failed = results.filter((r) => !r.ok);
  return {
    commit,
    ok: results.length > 0 && failed.length === 0,
    message: failed.length ? failed.map((f) => f.message).join(' ') : 'All components redeployed successfully.',
    resources: results,
  };
}

// ---------------------------------------------------------------------------
// Orchestrator: apply current fix, redeploy, and on failure re-diagnose and
// retry automatically up to maxAttempts (3). Only the FIRST code-fix push
// requires the user's explicit approval (handled by the controller calling
// approveFixAndStart before this ever runs) - retries within this loop don't
// ask again, per product decision.
// ---------------------------------------------------------------------------

async function updateTroubleshooting(id, patch) {
  await DeploymentTroubleshooting.updateOne({ _id: id }, { $set: patch });
}

async function checkStopOrThrow(id) {
  const doc = await DeploymentTroubleshooting.findById(id).select('status').lean();
  if (doc && doc.status === 'stopping') {
    await updateTroubleshooting(id, { status: 'stopped' });
    throw new TroubleshootingStoppedSignal();
  }
}

async function rediagnoseFromResources(doc, deployment, creds, resourcesJustRedeployed) {
  let combinedLogs = '';
  for (const { resource, deployId } of resourcesJustRedeployed) {
    const cred = creds[resource.platform];
    if (!cred) continue;
    combinedLogs += `\n--- ${resource.componentName} ---\n${await fetchDeployFailureLogs(resource, cred, deployId)}`;
  }
  combinedLogs = combinedLogs.slice(-MAX_LOG_CHARS);

  const signature = extractErrorSignature(combinedLogs);
  const kbMatches = await errorKnowledgeService.retrieveErrorContext(`${signature.type} ${signature.excerpt}`.trim());
  const componentNames = (deployment.resources || []).map((r) => r.componentName);

  const message = [
    `Known component names: ${componentNames.join(', ') || '(none)'}`,
    `Regex-derived error signature: ${signature.type}${signature.excerpt ? ` ("${signature.excerpt}")` : ''}`,
    `This is a retry after a previous fix attempt did not resolve the deployment.`,
    '',
    '--- FAILURE LOGS (truncated) ---',
    combinedLogs || '(no new logs were available)',
    '',
    '--- RELATED KNOWN ERROR PATTERNS FROM KNOWLEDGE BASE ---',
    kbMatches.length ? kbMatches.map((m) => `[${m.label}] ${m.text}`).join('\n\n') : '(no matches found)',
    '',
    '/no_think',
  ].join('\n');

  const runner = getDiagnosisRunner();
  const parsed = await runLlm(runner, message);
  return normalizeDiagnosis(parsed, signature, kbMatches);
}

async function runAutoFixOrchestrator(troubleshootingId, { githubToken } = {}) {
  runningJobs.set(String(troubleshootingId), true);
  try {
    let doc = await DeploymentTroubleshooting.findById(troubleshootingId);
    if (!doc) return;

    const deployment = await Deployment.findById(doc.deploymentId).lean();
    if (!deployment) throw new DeploymentTroubleshootingError('The original deployment could not be found.', 404);

    const platforms = [...new Set((deployment.resources || []).map((r) => r.platform))];
    const creds = {};
    for (const platform of platforms) {
      creds[platform] = await credentialService.getDecryptedKey(deployment.userId, platform);
    }

    while (doc.attempt < doc.maxAttempts) {
      await checkStopOrThrow(troubleshootingId);
      doc.attempt += 1;
      const attemptNumber = doc.attempt;
      const startedAt = new Date();
      await updateTroubleshooting(troubleshootingId, { status: 'applying_fix', attempt: attemptNumber });

      let outcome;
      let appliedFixSummary;
      try {
        if (doc.diagnosis.category === 'env') {
          outcome = await applyEnvFixAndRedeploy(doc, deployment, creds);
          appliedFixSummary = { type: 'env', envFixes: doc.diagnosis.envFixes };
        } else if (doc.diagnosis.category === 'code') {
          outcome = await applyCodeFixAndRedeploy(doc, deployment, creds, githubToken);
          appliedFixSummary = { type: 'code', files: (doc.proposedFix.files || []).map((f) => f.path) };
        } else {
          outcome = { ok: false, message: `This failure is categorized as "${doc.diagnosis.category}" and cannot be auto-fixed.`, resources: [] };
          appliedFixSummary = { type: doc.diagnosis.category };
        }
      } catch (err) {
        outcome = { ok: false, message: err.message, resources: [] };
        appliedFixSummary = { type: doc.diagnosis.category, error: err.message };
      }

      await checkStopOrThrow(troubleshootingId);

      await DeploymentTroubleshooting.updateOne(
        { _id: troubleshootingId },
        {
          $push: {
            attemptHistory: {
              attemptNumber,
              diagnosis: doc.diagnosis,
              userChoice: 'auto',
              appliedFix: appliedFixSummary,
              commit: outcome.commit || null,
              redeployOutcome: { ok: outcome.ok, message: outcome.message },
              startedAt,
              finishedAt: new Date(),
            },
          },
        }
      );

      if (outcome.ok) {
        await updateTroubleshooting(troubleshootingId, {
          status: 'succeeded',
          resolution: { summary: `Resolved after ${attemptNumber} attempt(s).`, unresolvedReason: '' },
        });
        return;
      }

      const failedResources = (outcome.resources || []).filter((r) => !r.ok);
      if (!failedResources.length || attemptNumber >= doc.maxAttempts) {
        await updateTroubleshooting(troubleshootingId, {
          status: 'failed',
          resolution: {
            summary: `Deployment still failing after ${attemptNumber} attempt(s).`,
            unresolvedReason: outcome.message || 'The applied fix did not resolve the deployment failure.',
          },
        });
        return;
      }

      // Automatic retry: re-diagnose using the fresh failure logs from this
      // attempt's redeploy, then loop. No further user approval is asked for
      // (decision: the user already opted into auto-fix for this session).
      const newDiagnosis = await rediagnoseFromResources(doc, deployment, creds, failedResources);
      // Persist before generateCodeFix, which re-reads the doc fresh from the
      // DB - without this it would still see the previous attempt's diagnosis.
      await updateTroubleshooting(troubleshootingId, { diagnosis: newDiagnosis, proposedFix: { files: [], commitMessage: '' } });
      doc.diagnosis = newDiagnosis;
      doc.proposedFix = { files: [], commitMessage: '' };

      if (newDiagnosis.category === 'code') {
        try {
          doc = await generateCodeFix(troubleshootingId, doc.userId, githubToken);
        } catch (err) {
          await updateTroubleshooting(troubleshootingId, {
            status: 'failed',
            resolution: {
              summary: `Deployment still failing after ${attemptNumber} attempt(s).`,
              unresolvedReason: `Could not generate a retry fix: ${err.message}`,
            },
          });
          return;
        }
      }
    }
  } catch (err) {
    if (err instanceof TroubleshootingStoppedSignal) return;
    console.error(`Deployment troubleshooting ${troubleshootingId} failed:`, err);
    await DeploymentTroubleshooting.updateOne(
      { _id: troubleshootingId, status: { $nin: ['succeeded', 'failed', 'manual', 'stopped'] } },
      { $set: { status: 'failed', resolution: { summary: `Troubleshooting stopped due to an error: ${err.message}`, unresolvedReason: err.message } } }
    );
  } finally {
    runningJobs.delete(String(troubleshootingId));
  }
}

function startAutoFix(troubleshootingId, options) {
  runAutoFixOrchestrator(troubleshootingId, options).catch((err) => {
    console.error(`Unhandled troubleshooting orchestrator error for ${troubleshootingId}:`, err);
  });
}

async function requestStop(troubleshootingId, userId) {
  const doc = await DeploymentTroubleshooting.findOne({ _id: troubleshootingId, userId });
  if (!doc) throw new DeploymentTroubleshootingError('Troubleshooting session not found.', 404);
  if (!['applying_fix', 'redeploying'].includes(doc.status)) {
    throw new DeploymentTroubleshootingError('This troubleshooting session is not currently running.', 400);
  }
  await DeploymentTroubleshooting.updateOne({ _id: troubleshootingId }, { $set: { status: 'stopping' } });
  if (!runningJobs.has(String(troubleshootingId))) {
    await DeploymentTroubleshooting.updateOne({ _id: troubleshootingId }, { $set: { status: 'stopped' } });
  }
}

module.exports = {
  DeploymentTroubleshootingError,
  diagnose,
  generateCodeFix,
  resolveManual,
  startAutoFix,
  requestStop,
};
