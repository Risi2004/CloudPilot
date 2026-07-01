const ArchitectureSession = require('../models/ArchitectureSession');
const { normalizeRepoUrl } = require('../utils/normalizeRepoUrl');

async function saveArchitectureSession({
  userId,
  sourceUrl,
  analysisSessionId,
  platformSelectionSessionId,
  blueprint,
  componentAnalysis,
  platformsEvaluated,
  existingSessionId,
}) {
  const normalizedUrl = normalizeRepoUrl(sourceUrl);
  const payload = {
    userId,
    sourceUrl: sourceUrl.trim(),
    normalizedUrl,
    analysisSessionId,
    platformSelectionSessionId,
    blueprint,
    componentAnalysis: componentAnalysis || null,
    platformsEvaluated: platformsEvaluated || [],
  };

  if (existingSessionId) {
    const updated = await ArchitectureSession.findOneAndUpdate(
      { _id: existingSessionId, userId },
      payload,
      { new: true },
    );
    if (updated) return updated;
  }

  return ArchitectureSession.create({
    ...payload,
    createdAt: new Date(),
  });
}

async function getArchitectureSessionById(userId, sessionId) {
  return ArchitectureSession.findOne({ _id: sessionId, userId });
}

async function getArchitectureSessionByPlatformSelection(userId, platformSelectionSessionId) {
  return ArchitectureSession.findOne({ userId, platformSelectionSessionId }).sort({ createdAt: -1 });
}

module.exports = {
  saveArchitectureSession,
  getArchitectureSessionById,
  getArchitectureSessionByPlatformSelection,
};
