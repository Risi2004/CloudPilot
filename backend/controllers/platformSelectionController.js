const { runPlatformSelection } = require('../services/agentRuntimeClient');
const { getRepositoryAnalysisSessionById } = require('../services/analysisSessionService');
const {
  savePlatformSelectionSession,
  getPlatformSelectionSessionById,
} = require('../services/platformSelectionSessionService');

const MAX_INTERVIEW_ANSWERS = 20;

/**
 * Run one platform selection step (adaptive interview or final recommendation).
 *
 * Body: {
 *   analysis_session_id: string,
 *   platform_selection_session_id?: string,
 *   interview_answers?: [{ question_id, question, answer }]
 * }
 */
const platformSelectionStep = async (req, res, next) => {
  try {
    const {
      analysis_session_id: analysisSessionId,
      platform_selection_session_id: platformSelectionSessionId,
      interview_answers: interviewAnswers,
    } = req.body;

    if (!analysisSessionId || typeof analysisSessionId !== 'string') {
      return res.status(400).json({ message: 'analysis_session_id is required.' });
    }

    const analysisSession = await getRepositoryAnalysisSessionById(req.user._id, analysisSessionId);
    if (!analysisSession?.result) {
      return res.status(404).json({
        message: 'Repository analysis session not found or expired. Run analysis again.',
      });
    }

    const answers = Array.isArray(interviewAnswers) ? interviewAnswers : [];

    if (answers.length > MAX_INTERVIEW_ANSWERS) {
      return res.status(400).json({
        message: `Too many interview answers. Maximum is ${MAX_INTERVIEW_ANSWERS}.`,
      });
    }

    for (const entry of answers) {
      if (!entry?.question_id || !entry?.question || entry?.answer === undefined) {
        return res.status(400).json({
          message: 'Each interview answer must include question_id, question, and answer.',
        });
      }
    }

    const result = await runPlatformSelection({
      repository_analysis: analysisSession.result,
      interview_answers: answers,
    });

    const session = await savePlatformSelectionSession({
      userId: req.user._id,
      sourceUrl: analysisSession.sourceUrl,
      analysisSessionId: analysisSession._id,
      status: result.status === 'complete' ? 'complete' : 'interview',
      interviewAnswers: answers,
      lastStepResult: result,
      recommendation: result.recommendation || null,
      existingSessionId: platformSelectionSessionId || null,
    });

    return res.status(200).json({
      platform_selection_session_id: session._id.toString(),
      analysis_session_id: analysisSession._id.toString(),
      sourceUrl: analysisSession.sourceUrl,
      ...result,
    });
  } catch (err) {
    const message = err.message || 'Platform selection failed.';

    if (/timed out/i.test(message)) {
      return res.status(504).json({ message });
    }
    if (/ollama|connection|litellm|json/i.test(message)) {
      return res.status(502).json({ message });
    }

    return next(err);
  }
};

const getPlatformSelectionSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await getPlatformSelectionSessionById(req.user._id, sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Platform selection session not found or expired.' });
    }

    return res.status(200).json({
      platform_selection_session_id: session._id.toString(),
      analysis_session_id: session.analysisSessionId.toString(),
      sourceUrl: session.sourceUrl,
      status: session.status,
      interview_answers: session.interviewAnswers,
      last_step_result: session.lastStepResult,
      recommendation: session.recommendation,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  platformSelectionStep,
  getPlatformSelectionSession,
};
