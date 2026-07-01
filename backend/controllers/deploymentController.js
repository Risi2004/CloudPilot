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

    const architectureSession = await getArchitectureSessionById(req.user._id, architectureSessionId);
    if (!architectureSession?.blueprint) {
      return res.status(404).json({
        message: 'Architecture session not found or expired. Generate a blueprint first.',
      });
    }

    const analysisSession = await getRepositoryAnalysisSessionById(
      req.user._id,
      architectureSession.analysisSessionId,
    );
    if (!analysisSession?.result) {
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

    let existingSession = null;
    if (deploymentSessionId) {
      existingSession = await getDeploymentSessionById(req.user._id, deploymentSessionId);
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

    const agentPayload = {
      action,
      blueprint: existingSession?.blueprint || architectureSession.blueprint,
      repository_analysis: analysisSession.result,
      source_url: architectureSession.sourceUrl,
      branch: branch || existingSession?.branch,
      credentials,
      github_token: githubToken,
      env_vars: {
        ...(existingSession?.deploymentState?.env_vars || {}),
        ...(envVars || {}),
      },
      confirmed: Boolean(confirmed),
      deployment_state: existingSession?.deploymentState || null,
    };

    const timeoutAction = action === 'poll' ? 'poll' : 'default';
    const agentResult = await runDeployment(agentPayload, timeoutAction);

    const mergedEnvVars = {
      ...(existingSession?.deploymentState?.env_vars || {}),
      ...(envVars || {}),
    };
    Object.keys(mergedEnvVars).forEach((key) => {
      if (mergedEnvVars[key] === '****') {
        delete mergedEnvVars[key];
      }
    });

    const deploymentState = {
      ...(agentResult.deployment_state || existingSession?.deploymentState || {}),
      env_vars: Object.keys(mergedEnvVars).length ? mergedEnvVars : agentResult.deployment_state?.env_vars,
    };

    const now = new Date();
    const session = await saveDeploymentSession({
      userId: req.user._id,
      sourceUrl: architectureSession.sourceUrl,
      analysisSessionId: architectureSession.analysisSessionId,
      platformSelectionSessionId: architectureSession.platformSelectionSessionId,
      architectureSessionId: architectureSession._id,
      blueprint: existingSession?.blueprint || architectureSession.blueprint,
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
    if (/ollama|connection|litellm|json|vercel|render|github/i.test(message)) {
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
