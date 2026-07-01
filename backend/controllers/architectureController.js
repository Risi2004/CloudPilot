const { runArchitectureBlueprint } = require('../services/agentRuntimeClient');
const { getRepositoryAnalysisSessionById } = require('../services/analysisSessionService');
const { getPlatformSelectionSessionById } = require('../services/platformSelectionSessionService');
const {
  saveArchitectureSession,
  getArchitectureSessionById,
  getArchitectureSessionByPlatformSelection,
} = require('../services/architectureSessionService');

function formatArchitectureResponse(session, agentResult) {
  return {
    architecture_session_id: session._id.toString(),
    analysis_session_id: session.analysisSessionId.toString(),
    platform_selection_session_id: session.platformSelectionSessionId.toString(),
    sourceUrl: session.sourceUrl,
    blueprint: agentResult?.blueprint || session.blueprint,
    component_analysis: agentResult?.component_analysis || session.componentAnalysis,
    platforms_evaluated: agentResult?.platforms_evaluated || session.platformsEvaluated,
  };
}

const generateArchitecture = async (req, res, next) => {
  try {
    const {
      analysis_session_id: analysisSessionId,
      platform_selection_session_id: platformSelectionSessionId,
      forceRefresh,
    } = req.body;

    if (!analysisSessionId || typeof analysisSessionId !== 'string') {
      return res.status(400).json({ message: 'analysis_session_id is required.' });
    }
    if (!platformSelectionSessionId || typeof platformSelectionSessionId !== 'string') {
      return res.status(400).json({ message: 'platform_selection_session_id is required.' });
    }

    const analysisSession = await getRepositoryAnalysisSessionById(req.user._id, analysisSessionId);
    if (!analysisSession?.result) {
      return res.status(404).json({
        message: 'Repository analysis session not found or expired. Run analysis again.',
      });
    }

    const platformSession = await getPlatformSelectionSessionById(
      req.user._id,
      platformSelectionSessionId,
    );
    if (!platformSession) {
      return res.status(404).json({
        message: 'Platform selection session not found or expired.',
      });
    }
    if (platformSession.status !== 'complete' || !platformSession.recommendation) {
      return res.status(400).json({
        message: 'Platform selection must be completed before generating architecture.',
      });
    }

    if (!forceRefresh) {
      const existing = await getArchitectureSessionByPlatformSelection(
        req.user._id,
        platformSelectionSessionId,
      );
      if (existing?.blueprint) {
        return res.status(200).json(formatArchitectureResponse(existing));
      }
    }

    const agentResult = await runArchitectureBlueprint({
      repository_analysis: analysisSession.result,
      platform_recommendation: platformSession.recommendation,
      user_preferences: platformSession.interviewAnswers || [],
      platform_filter: platformSession.recommendation?.primary_platform || null,
    });

    const session = await saveArchitectureSession({
      userId: req.user._id,
      sourceUrl: analysisSession.sourceUrl,
      analysisSessionId: analysisSession._id,
      platformSelectionSessionId: platformSession._id,
      blueprint: agentResult.blueprint,
      componentAnalysis: agentResult.component_analysis,
      platformsEvaluated: agentResult.platforms_evaluated,
      existingSessionId: forceRefresh
        ? (await getArchitectureSessionByPlatformSelection(req.user._id, platformSelectionSessionId))?._id
        : null,
    });

    return res.status(200).json(formatArchitectureResponse(session, agentResult));
  } catch (err) {
    const message = err.message || 'Architecture generation failed.';

    if (/timed out/i.test(message)) {
      return res.status(504).json({ message });
    }
    if (/ollama|connection|litellm|json/i.test(message)) {
      return res.status(502).json({ message });
    }

    return next(err);
  }
};

const getArchitectureSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await getArchitectureSessionById(req.user._id, sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Architecture session not found or expired.' });
    }

    return res.status(200).json(formatArchitectureResponse(session));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  generateArchitecture,
  getArchitectureSession,
};
