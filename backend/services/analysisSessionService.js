const RepositoryAnalysisSession = require('../models/RepositoryAnalysisSession');
const { normalizeRepoUrl } = require('../utils/normalizeRepoUrl');

async function saveRepositoryAnalysisSession(userId, sourceUrl, result) {
  const normalizedUrl = normalizeRepoUrl(sourceUrl);
  const session = await RepositoryAnalysisSession.findOneAndUpdate(
    { userId, normalizedUrl },
    {
      userId,
      sourceUrl: sourceUrl.trim(),
      normalizedUrl,
      result,
      createdAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return session;
}

async function getRepositoryAnalysisSessionById(userId, sessionId) {
  return RepositoryAnalysisSession.findOne({ _id: sessionId, userId });
}

async function getRepositoryAnalysisSessionByUrl(userId, sourceUrl) {
  const normalizedUrl = normalizeRepoUrl(sourceUrl);
  return RepositoryAnalysisSession.findOne({ userId, normalizedUrl }).sort({ createdAt: -1 });
}

module.exports = {
  saveRepositoryAnalysisSession,
  getRepositoryAnalysisSessionById,
  getRepositoryAnalysisSessionByUrl,
};
