const { runRepositoryAnalysis } = require('../services/agentRuntimeClient');
const {
  saveRepositoryAnalysisSession,
  getRepositoryAnalysisSessionById,
  getRepositoryAnalysisSessionByUrl,
} = require('../services/analysisSessionService');

const GITHUB_URL_PATTERN =
  /^https?:\/\/(www\.)?github\.com\/[\w.\-]+\/[\w.\-]+(?:\.git)?(?:\/.*)?$/i;

function formatAnalysisResponse(session, result) {
  return {
    sessionId: session._id.toString(),
    sourceUrl: session.sourceUrl,
    ...result,
  };
}

const analyzeRepository = async (req, res, next) => {
  try {
    const { source, forceRefresh } = req.body;

    if (!source || typeof source !== 'string' || !source.trim()) {
      return res.status(400).json({ message: 'Repository source URL is required.' });
    }

    const normalized = source.trim();

    if (!GITHUB_URL_PATTERN.test(normalized)) {
      return res.status(400).json({
        message: 'Only public GitHub repository URLs are supported (https://github.com/owner/repo).',
      });
    }

    if (!forceRefresh) {
      const existing = await getRepositoryAnalysisSessionByUrl(req.user._id, normalized);
      if (existing?.result) {
        return res.status(200).json(formatAnalysisResponse(existing, existing.result));
      }
    }

    const result = await runRepositoryAnalysis(normalized);
    const session = await saveRepositoryAnalysisSession(req.user._id, normalized, result);

    res.status(200).json(formatAnalysisResponse(session, result));
  } catch (err) {
    const message = err.message || 'Repository analysis failed.';
    if (
      message.includes('required') ||
      message.includes('Invalid') ||
      message.includes('not exist') ||
      message.includes('GitHub repository URL')
    ) {
      return res.status(400).json({ message });
    }
    if (message.includes('timed out') || message.includes('agent runtime')) {
      return res.status(504).json({ message });
    }
    if (
      message.includes('valid JSON') ||
      message.includes('Ollama') ||
      message.includes('AI model unavailable')
    ) {
      return res.status(502).json({ message });
    }
    next(err);
  }
};

const getAnalysisSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { url } = req.query;

    let session = null;

    if (sessionId) {
      session = await getRepositoryAnalysisSessionById(req.user._id, sessionId);
    } else if (url) {
      session = await getRepositoryAnalysisSessionByUrl(req.user._id, url);
    } else {
      return res.status(400).json({ message: 'Provide sessionId or url query parameter.' });
    }

    if (!session) {
      return res.status(404).json({ message: 'Analysis session not found or expired.' });
    }

    return res.status(200).json(formatAnalysisResponse(session, session.result));
  } catch (err) {
    next(err);
  }
};

module.exports = { analyzeRepository, getAnalysisSession };
