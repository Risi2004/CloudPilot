const DeploymentSession = require('../models/DeploymentSession');
const { normalizeRepoUrl } = require('../utils/normalizeRepoUrl');

async function saveDeploymentSession({
  userId,
  sourceUrl,
  analysisSessionId,
  platformSelectionSessionId,
  architectureSessionId,
  blueprint,
  branch,
  status,
  missingInputs,
  deploymentSummary,
  deploymentState,
  progress,
  report,
  failureAnalysis,
  confirmedAt,
  startedAt,
  completedAt,
  existingSessionId,
}) {
  const normalizedUrl = normalizeRepoUrl(sourceUrl);
  const payload = {
    userId,
    sourceUrl: sourceUrl.trim(),
    normalizedUrl,
    analysisSessionId,
    platformSelectionSessionId,
    architectureSessionId,
    blueprint,
    branch: branch || 'main',
    status: status || 'preparing',
    missingInputs: missingInputs || [],
    deploymentSummary: deploymentSummary || null,
    deploymentState: deploymentState || null,
    progress: progress || null,
    report: report || null,
    failureAnalysis: failureAnalysis || null,
    confirmedAt: confirmedAt || null,
    startedAt: startedAt || null,
    completedAt: completedAt || null,
  };

  if (existingSessionId) {
    const updated = await DeploymentSession.findOneAndUpdate(
      { _id: existingSessionId, userId },
      payload,
      { new: true },
    );
    if (updated) return updated;
  }

  return DeploymentSession.create({
    ...payload,
    createdAt: new Date(),
  });
}

async function getDeploymentSessionById(userId, sessionId) {
  return DeploymentSession.findOne({ _id: sessionId, userId });
}

async function getDeploymentSessionByArchitecture(userId, architectureSessionId) {
  return DeploymentSession.findOne({ userId, architectureSessionId }).sort({ createdAt: -1 });
}

module.exports = {
  saveDeploymentSession,
  getDeploymentSessionById,
  getDeploymentSessionByArchitecture,
};
