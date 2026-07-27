const Analysis = require('../models/Analysis');
const PlatformInterview = require('../models/PlatformInterview');
const ArchitectureRecommendation = require('../models/ArchitectureRecommendation');
const { retrieveContext } = require('../services/knowledgeRetrievalService');
const { runArchitectureGeneration, ArchitectureGenerationError } = require('../agents/architectureGenerationAgent');

function buildQuery(analysisResult, platformRecommendation) {
  const r = analysisResult || {};
  const architecture = r.architecture || {};
  const list = Array.isArray(platformRecommendation && platformRecommendation.recommendations)
    ? platformRecommendation.recommendations
    : platformRecommendation
      ? [platformRecommendation]
      : [];
  const platforms = list.map((rec) => rec.platform).filter(Boolean);

  return [r.language, r.framework, architecture.type, architecture.pattern, ...platforms, 'deployment architecture Render Vercel']
    .filter(Boolean)
    .join(' ');
}

function serializeRecommendation(doc) {
  return {
    repoUrl: doc.repoUrl,
    status: doc.status,
    result: doc.result,
    updatedAt: doc.updatedAt,
  };
}

const getArchitecture = async (req, res) => {
  const { repoUrl } = req.query;
  if (!repoUrl) {
    return res.status(400).json({ message: 'repoUrl is required.' });
  }

  try {
    const recommendation = await ArchitectureRecommendation.findOne({ userId: req.user._id, repoUrl });
    if (!recommendation) {
      return res.status(200).json({ recommendation: null });
    }
    return res.status(200).json({ recommendation: serializeRecommendation(recommendation) });
  } catch (err) {
    console.error('Failed to load architecture recommendation:', err);
    return res.status(500).json({ message: 'Failed to load the architecture recommendation.' });
  }
};

const generateArchitecture = async (req, res) => {
  const { repoUrl, regenerate } = req.body;
  if (!repoUrl) {
    return res.status(400).json({ message: 'repoUrl is required.' });
  }

  try {
    const analysis = await Analysis.findOne({ userId: req.user._id, repoUrl, status: 'completed' });
    if (!analysis) {
      return res.status(404).json({ message: 'No completed analysis found for this repository. Run repository analysis first.' });
    }

    const platformInterview = await PlatformInterview.findOne({ userId: req.user._id, repoUrl, status: 'completed' });
    if (!platformInterview) {
      return res.status(404).json({ message: 'Complete the platform selection interview for this repository first.' });
    }

    if (!regenerate) {
      const existing = await ArchitectureRecommendation.findOne({ userId: req.user._id, repoUrl });
      if (existing) {
        return res.status(200).json({ recommendation: serializeRecommendation(existing) });
      }
    }

    const kbContext = await retrieveContext(buildQuery(analysis.result, platformInterview.recommendation));

    const result = await runArchitectureGeneration({
      analysisResult: analysis.result,
      deploymentReadiness: analysis.deploymentReadiness,
      platformRecommendation: platformInterview.recommendation,
      kbContext,
    });

    const recommendation = await ArchitectureRecommendation.findOneAndUpdate(
      { userId: req.user._id, repoUrl },
      {
        userId: req.user._id,
        repoUrl,
        status: 'completed',
        result,
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({ recommendation: serializeRecommendation(recommendation) });
  } catch (err) {
    if (err instanceof ArchitectureGenerationError) {
      return res.status(503).json({ message: err.message });
    }
    console.error('Architecture Generation Agent error:', err);
    return res.status(500).json({ message: 'Failed to generate architecture options. Please try again.' });
  }
};

module.exports = { getArchitecture, generateArchitecture };
