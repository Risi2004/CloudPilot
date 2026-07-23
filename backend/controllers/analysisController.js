const Analysis = require('../models/Analysis');
const { fetchProjectMetadataFiles, GithubFileError } = require('../services/githubFileService');
const { runCodeAnalysisAgent, AnalysisError } = require('../agents/codeAnalysisAgent');

const analyzeRepository = async (req, res) => {
  const { repoUrl, githubToken, force } = req.body;

  if (!repoUrl) {
    return res.status(400).json({ message: 'repoUrl is required.' });
  }
  if (!githubToken) {
    return res.status(401).json({ message: 'A GitHub token is required to analyze this repository.' });
  }

  try {
    if (!force) {
      const cached = await Analysis.findOne({ userId: req.user._id, repoUrl, status: 'completed' });
      if (cached) {
        return res.status(200).json({
          status: 'cached',
          repoUrl: cached.repoUrl,
          repoFullName: cached.repoFullName,
          detectedFiles: cached.detectedFiles,
          result: cached.result,
          analyzedAt: cached.updatedAt,
        });
      }
    }

    const { detectedFiles, repoFullName } = await fetchProjectMetadataFiles(repoUrl, githubToken);

    if (detectedFiles.length === 0) {
      return res.status(422).json({
        message: 'No recognizable project metadata files (package.json, requirements.txt, etc.) were found in this repository.',
      });
    }

    const result = await runCodeAnalysisAgent({
      repoUrl,
      files: detectedFiles,
      userId: String(req.user._id),
    });

    const detectedFilePaths = detectedFiles.map((f) => f.path);

    const saved = await Analysis.findOneAndUpdate(
      { userId: req.user._id, repoUrl },
      {
        userId: req.user._id,
        repoUrl,
        repoFullName,
        detectedFiles: detectedFilePaths,
        result,
        status: 'completed',
        errorMessage: null,
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      status: 'completed',
      repoUrl: saved.repoUrl,
      repoFullName: saved.repoFullName,
      detectedFiles: saved.detectedFiles,
      result: saved.result,
      analyzedAt: saved.updatedAt,
    });
  } catch (err) {
    if (err instanceof GithubFileError) {
      return res.status(err.statusCode || 502).json({ message: err.message });
    }
    if (err instanceof AnalysisError) {
      return res.status(503).json({ message: err.message });
    }
    console.error('Code Analysis Agent error:', err);
    return res.status(500).json({ message: 'Failed to analyze repository. Please try again.' });
  }
};

module.exports = { analyzeRepository };
