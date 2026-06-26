const { runRepositoryAnalysis } = require('../services/agentRuntimeClient');

const GITHUB_URL_PATTERN =
  /^https?:\/\/(www\.)?github\.com\/[\w.\-]+\/[\w.\-]+(?:\.git)?(?:\/.*)?$/i;

const analyzeRepository = async (req, res, next) => {
  try {
    const { source } = req.body;

    if (!source || typeof source !== 'string' || !source.trim()) {
      return res.status(400).json({ message: 'Repository source URL is required.' });
    }

    const normalized = source.trim();

    if (!GITHUB_URL_PATTERN.test(normalized)) {
      return res.status(400).json({
        message: 'Only public GitHub repository URLs are supported (https://github.com/owner/repo).',
      });
    }

    const result = await runRepositoryAnalysis(normalized);
    res.status(200).json(result);
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
    next(err);
  }
};

module.exports = { analyzeRepository };
