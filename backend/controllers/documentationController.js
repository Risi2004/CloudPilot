const { runDocumentationQuery } = require('../services/agentRuntimeClient');

const queryDocumentation = async (req, res, next) => {
  try {
    const { question, repository_analysis: repositoryAnalysis, platform_filter: platformFilter, top_k: topK } =
      req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ message: 'Question is required.' });
    }

    const result = await runDocumentationQuery({
      question: question.trim(),
      repository_analysis: repositoryAnalysis || null,
      platform_filter: platformFilter || null,
      top_k: topK || null,
    });

    res.status(200).json(result);
  } catch (err) {
    const message = err.message || 'Documentation query failed.';
    if (/ollama|connection|litellm|embedding/i.test(message)) {
      return res.status(502).json({
        message:
          'Documentation AI unavailable. Ensure Ollama is running and EMBEDDING_MODEL / OLLAMA_MODEL are configured.',
      });
    }
    next(err);
  }
};

module.exports = { queryDocumentation };
