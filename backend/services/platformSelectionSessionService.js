const PlatformSelectionSession = require('../models/PlatformSelectionSession');
const { normalizeRepoUrl } = require('../utils/normalizeRepoUrl');

async function savePlatformSelectionSession({
  userId,
  sourceUrl,
  analysisSessionId,
  status,
  interviewAnswers,
  lastStepResult,
  recommendation,
  existingSessionId,
}) {
  const normalizedUrl = normalizeRepoUrl(sourceUrl);
  const payload = {
    userId,
    sourceUrl: sourceUrl.trim(),
    normalizedUrl,
    analysisSessionId,
    status,
    interviewAnswers,
    lastStepResult,
    recommendation: recommendation || null,
    updatedAt: new Date(),
  };

  if (existingSessionId) {
    const updated = await PlatformSelectionSession.findOneAndUpdate(
      { _id: existingSessionId, userId },
      payload,
      { new: true },
    );
    if (updated) return updated;
  }

  return PlatformSelectionSession.create({
    ...payload,
    createdAt: new Date(),
  });
}

async function getPlatformSelectionSessionById(userId, sessionId) {
  return PlatformSelectionSession.findOne({ _id: sessionId, userId });
}

async function getPlatformSelectionSessionByAnalysisSession(userId, analysisSessionId) {
  return PlatformSelectionSession.findOne({ userId, analysisSessionId }).sort({ updatedAt: -1 });
}

module.exports = {
  savePlatformSelectionSession,
  getPlatformSelectionSessionById,
  getPlatformSelectionSessionByAnalysisSession,
};
