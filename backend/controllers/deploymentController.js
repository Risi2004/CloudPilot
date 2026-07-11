const User = require('../models/User');
const { runDeployment } = require('../services/agentRuntimeClient');
const { getRepositoryAnalysisSessionById } = require('../services/analysisSessionService');
const { getArchitectureSessionById } = require('../services/architectureSessionService');
const {
  saveDeploymentSession,
  getDeploymentSessionById,
} = require('../services/deploymentSessionService');
const { getDecryptedAccessToken } = require('../services/githubService');
const {
  getDecryptedVercelToken,
  getDecryptedRenderApiKey,
  storeVercelCredentials,
  storeRenderCredentials,
} = require('../services/platformCredentialsService');

const VALID_ACTIONS = new Set([
  'prepare',
  'provide_inputs',
  'execute',
  'poll',
  'analyze_failure',
  'retry',
]);

function maskEnvVars(envVars = {}) {
  return Object.fromEntries(Object.keys(envVars).map((key) => [key, '****']));
}

function mergeEnvVars(...sources) {
  const merged = {};
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const [key, value] of Object.entries(source)) {
      if (value === '****') continue;
      merged[key] = value;
    }
  }
  return merged;
}

function formatDeploymentResponse(session, agentResult) {
  return {
    deployment_session_id: session._id.toString(),
    architecture_session_id: session.architectureSessionId.toString(),
    analysis_session_id: session.analysisSessionId.toString(),
    platform_selection_session_id: session.platformSelectionSessionId.toString(),
    sourceUrl: session.sourceUrl,
    branch: session.branch,
    status: agentResult?.status || session.status,
    validation_issues: agentResult?.validation_issues || [],
    missing_inputs: agentResult?.missing_inputs || session.missingInputs || [],
    deployment_summary: agentResult?.deployment_summary || session.deploymentSummary,
    deployment_state: agentResult?.deployment_state || session.deploymentState,
    progress: agentResult?.progress || session.progress,
    report: agentResult?.report || session.report,
    failure_analysis: agentResult?.failure_analysis || session.failureAnalysis,
    diagnostics: agentResult?.diagnostics || [],
    message: agentResult?.message || '',
  };
}

async function resolveCredentials(user, bodyCredentials = {}) {
  const vercelToken =
    bodyCredentials.vercel_token?.trim()
    || getDecryptedVercelToken(user)
    || '';
  const renderApiKey =
    bodyCredentials.render_api_key?.trim()
    || getDecryptedRenderApiKey(user)
    || '';

  return {
    vercel_token: vercelToken,
    render_api_key: renderApiKey,
  };
}

async function loadUserWithCredentials(userId) {
  return User.findById(userId).select('+github.accessToken +vercel.accessToken +render.apiKey');
}

const deploymentStep = async (req, res, next) => {
  try {
    const {
      architecture_session_id: architectureSessionId,
      deployment_session_id: deploymentSessionId,
      action = 'prepare',
      branch,
      credentials: bodyCredentials,
      env_vars: envVars,
      save_credentials: saveCredentials,
      confirmed,
    } = req.body;

    if (!architectureSessionId || typeof architectureSessionId !== 'string') {
      return res.status(400).json({ message: 'architecture_session_id is required.' });
    }
    if (!VALID_ACTIONS.has(action)) {
      return res.status(400).json({ message: `Invalid action. Must be one of: ${[...VALID_ACTIONS].join(', ')}` });
    }

    let existingSession = null;
    if (deploymentSessionId) {
      existingSession = await getDeploymentSessionById(req.user._id, deploymentSessionId);
    }

    const architectureSession = await getArchitectureSessionById(req.user._id, architectureSessionId);
    let blueprint = existingSession?.blueprint || null;
    let sourceUrl = existingSession?.sourceUrl || null;
    let analysisSessionId = existingSession?.analysisSessionId || null;
    let platformSelectionSessionId = existingSession?.platformSelectionSessionId || null;
    let architectureSessionRef = existingSession?.architectureSessionId || null;

    if (architectureSession?.blueprint) {
      blueprint = architectureSession.blueprint;
      sourceUrl = architectureSession.sourceUrl;
      analysisSessionId = architectureSession.analysisSessionId;
      platformSelectionSessionId = architectureSession.platformSelectionSessionId;
      architectureSessionRef = architectureSession._id;
    } else if (!blueprint) {
      return res.status(404).json({
        message: 'Architecture session not found or expired. Generate a blueprint first.',
      });
    }

    let repositoryAnalysis = existingSession?.repositoryAnalysis || null;
    const analysisSession = analysisSessionId
      ? await getRepositoryAnalysisSessionById(req.user._id, analysisSessionId)
      : null;
    if (analysisSession?.result) {
      repositoryAnalysis = analysisSession.result;
    } else if (!repositoryAnalysis) {
      return res.status(404).json({
        message: 'Repository analysis session not found or expired. Run analysis again.',
      });
    }

    const user = await loadUserWithCredentials(req.user._id);
    const githubToken = getDecryptedAccessToken(user);
    if (!githubToken) {
      return res.status(400).json({
        message: 'GitHub connection required before deployment.',
        code: 'github_required',
      });
    }

    const credentials = await resolveCredentials(user, bodyCredentials || {});

    if (saveCredentials) {
      if (bodyCredentials?.vercel_token?.trim()) {
        storeVercelCredentials(user, bodyCredentials.vercel_token.trim());
      }
      if (bodyCredentials?.render_api_key?.trim()) {
        storeRenderCredentials(user, bodyCredentials.render_api_key.trim());
      }
      await user.save();
    }

    const mergedEnvVars = mergeEnvVars(
      analysisSession?.envVars,
      existingSession?.deploymentState?.env_vars,
      envVars,
    );

    const agentPayload = {
      action,
      blueprint,
      repository_analysis: repositoryAnalysis,
      source_url: sourceUrl,
      branch: branch || existingSession?.branch,
      credentials,
      github_token: githubToken,
      env_vars: mergedEnvVars,
      confirmed: Boolean(confirmed),
      deployment_state: existingSession?.deploymentState || null,
    };

    const timeoutAction = action === 'poll' ? 'poll' : action === 'execute' ? 'execute' : 'default';
    const agentResult = await runDeployment(agentPayload, timeoutAction);

    const deploymentState = {
      ...(agentResult.deployment_state || existingSession?.deploymentState || {}),
      env_vars: Object.keys(mergedEnvVars).length ? mergedEnvVars : agentResult.deployment_state?.env_vars,
    };

    const now = new Date();
    const session = await saveDeploymentSession({
      userId: req.user._id,
      sourceUrl,
      analysisSessionId,
      platformSelectionSessionId,
      architectureSessionId: architectureSessionRef,
      repositoryAnalysis,
      blueprint,
      branch: branch || agentResult.deployment_state?.branch || existingSession?.branch || 'main',
      status: agentResult.status,
      missingInputs: agentResult.missing_inputs || [],
      deploymentSummary: agentResult.deployment_summary || existingSession?.deploymentSummary,
      deploymentState,
      progress: agentResult.progress || existingSession?.progress,
      report: agentResult.report || existingSession?.report,
      failureAnalysis: agentResult.failure_analysis || existingSession?.failureAnalysis,
      confirmedAt: confirmed ? now : existingSession?.confirmedAt,
      startedAt: action === 'execute' ? now : existingSession?.startedAt,
      completedAt: agentResult.status === 'complete' ? now : existingSession?.completedAt,
      existingSessionId: existingSession?._id || null,
    });

    const response = formatDeploymentResponse(session, agentResult);
    if (response.deployment_state?.env_vars) {
      response.deployment_state.env_vars = maskEnvVars(response.deployment_state.env_vars);
    }

    return res.status(200).json(response);
  } catch (err) {
    const message = err.message || 'Deployment step failed.';

    if (/timed out/i.test(message)) {
      return res.status(504).json({ message });
    }
    if (/ollama|connection|litellm|json/i.test(message)) {
      return res.status(502).json({ message });
    }

    return next(err);
  }
};

const getDeploymentSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await getDeploymentSessionById(req.user._id, sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Deployment session not found or expired.' });
    }

    const response = formatDeploymentResponse(session);
    if (response.deployment_state?.env_vars) {
      response.deployment_state.env_vars = maskEnvVars(response.deployment_state.env_vars);
    }

    return res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  deploymentStep,
  getDeploymentSession,
};
