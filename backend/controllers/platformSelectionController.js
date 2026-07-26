const Analysis = require('../models/Analysis');
const PlatformInterview = require('../models/PlatformInterview');
const { retrieveContext } = require('../services/knowledgeRetrievalService');
const { runPlatformSelectionTurn, PlatformSelectionError, MAX_QUESTIONS } = require('../agents/platformSelectionAgent');

function buildInitialQuery(analysisResult) {
  const r = analysisResult || {};
  const architecture = r.architecture || {};
  return [r.language, r.framework, architecture.type, architecture.pattern, 'deployment options Render Vercel']
    .filter(Boolean)
    .join(' ');
}

function buildFollowUpQuery(analysisResult, latestUserMessage) {
  const r = analysisResult || {};
  return [latestUserMessage, r.framework, r.language, 'Render Vercel deployment configuration'].filter(Boolean).join(' ');
}

function toPlainMessages(doc) {
  return (doc.messages || []).map((m) => ({
    role: m.role,
    content: m.content,
    quickReplies: m.quickReplies,
    createdAt: m.createdAt,
  }));
}

function serializeInterview(doc) {
  return {
    repoUrl: doc.repoUrl,
    status: doc.status,
    messages: toPlainMessages(doc),
    recommendation: doc.recommendation,
    updatedAt: doc.updatedAt,
  };
}

const getInterview = async (req, res) => {
  const { repoUrl } = req.query;
  if (!repoUrl) {
    return res.status(400).json({ message: 'repoUrl is required.' });
  }

  try {
    const interview = await PlatformInterview.findOne({ userId: req.user._id, repoUrl });
    if (!interview) {
      return res.status(200).json({ interview: null });
    }
    return res.status(200).json({ interview: serializeInterview(interview) });
  } catch (err) {
    console.error('Failed to load platform selection interview:', err);
    return res.status(500).json({ message: 'Failed to load the platform selection interview.' });
  }
};

const startInterview = async (req, res) => {
  const { repoUrl, restart } = req.body;
  if (!repoUrl) {
    return res.status(400).json({ message: 'repoUrl is required.' });
  }

  try {
    const analysis = await Analysis.findOne({ userId: req.user._id, repoUrl, status: 'completed' });
    if (!analysis) {
      return res.status(404).json({ message: 'No completed analysis found for this repository. Run repository analysis first.' });
    }

    if (!restart) {
      const existing = await PlatformInterview.findOne({ userId: req.user._id, repoUrl });
      if (existing) {
        return res.status(200).json({ interview: serializeInterview(existing) });
      }
    }

    const kbContext = await retrieveContext(buildInitialQuery(analysis.result));

    const turn = await runPlatformSelectionTurn({
      analysisResult: analysis.result,
      deploymentReadiness: analysis.deploymentReadiness,
      history: [],
      kbContext,
      mustRecommendNow: false,
    });

    const firstMessage = {
      role: 'agent',
      content: turn.message,
      quickReplies: turn.type === 'question' ? turn.quickReplies : undefined,
    };

    const interview = await PlatformInterview.findOneAndUpdate(
      { userId: req.user._id, repoUrl },
      {
        userId: req.user._id,
        repoUrl,
        messages: [firstMessage],
        status: turn.type === 'recommendation' ? 'completed' : 'in_progress',
        recommendation: turn.type === 'recommendation' ? turn : null,
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({ interview: serializeInterview(interview) });
  } catch (err) {
    if (err instanceof PlatformSelectionError) {
      return res.status(503).json({ message: err.message });
    }
    console.error('Platform Selection Agent error:', err);
    return res.status(500).json({ message: 'Failed to start the platform selection interview. Please try again.' });
  }
};

const postMessage = async (req, res) => {
  const { repoUrl, message } = req.body;
  if (!repoUrl) {
    return res.status(400).json({ message: 'repoUrl is required.' });
  }
  if (!message || !String(message).trim()) {
    return res.status(400).json({ message: 'message is required.' });
  }

  try {
    const interview = await PlatformInterview.findOne({ userId: req.user._id, repoUrl });
    if (!interview) {
      return res.status(404).json({ message: 'No platform selection interview found for this repository. Start one first.' });
    }
    if (interview.status !== 'in_progress') {
      return res.status(400).json({ message: 'This interview has already been completed. Restart it to ask again.' });
    }

    const analysis = await Analysis.findOne({ userId: req.user._id, repoUrl, status: 'completed' });
    if (!analysis) {
      return res.status(404).json({ message: 'No completed analysis found for this repository.' });
    }

    interview.messages.push({ role: 'user', content: String(message).trim() });

    const questionsAsked = interview.messages.filter((m) => m.role === 'agent').length;
    const mustRecommendNow = questionsAsked >= MAX_QUESTIONS;

    const kbContext = await retrieveContext(buildFollowUpQuery(analysis.result, message));

    const historyForAgent = interview.messages.map((m) => ({ role: m.role, content: m.content }));

    const turn = await runPlatformSelectionTurn({
      analysisResult: analysis.result,
      deploymentReadiness: analysis.deploymentReadiness,
      history: historyForAgent,
      kbContext,
      mustRecommendNow,
    });

    interview.messages.push({
      role: 'agent',
      content: turn.message,
      quickReplies: turn.type === 'question' ? turn.quickReplies : undefined,
    });

    if (turn.type === 'recommendation') {
      interview.status = 'completed';
      interview.recommendation = turn;
    }

    await interview.save();

    return res.status(200).json({ interview: serializeInterview(interview) });
  } catch (err) {
    if (err instanceof PlatformSelectionError) {
      return res.status(503).json({ message: err.message });
    }
    console.error('Platform Selection Agent error:', err);
    return res.status(500).json({ message: 'Failed to continue the platform selection interview. Please try again.' });
  }
};

module.exports = { getInterview, startInterview, postMessage };
