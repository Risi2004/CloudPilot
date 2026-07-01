import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import AnalysisLoader from '../../components/RepositoryAnalysis/AnalysisLoader';
import InterviewChat from '../../components/PlatformSelection/InterviewChat';
import RecommendationPanel from '../../components/PlatformSelection/RecommendationPanel';
import { getOrAnalyzeRepository, getAnalysisSession } from '../../services/repositoryAnalysis';
import { platformSelectionStep } from '../../services/platformSelection';
import './PlatformSelection.css';

function PlatformSelection() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const repoUrl = searchParams.get('url');
  const analysisSessionIdParam = searchParams.get('analysisSessionId');
  const forceRescan = searchParams.get('rescan') === '1';

  const [phase, setPhase] = useState('loading-analysis');
  const [error, setError] = useState(null);
  const [analysisSessionId, setAnalysisSessionId] = useState(analysisSessionIdParam);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [usedStoredAnalysis, setUsedStoredAnalysis] = useState(false);

  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [interviewAnswers, setInterviewAnswers] = useState([]);
  const [confidence, setConfidence] = useState(0);
  const [knownFromAnalysis, setKnownFromAnalysis] = useState([]);
  const [answerInput, setAnswerInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [platformSelectionSessionId, setPlatformSelectionSessionId] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [platformsEvaluated, setPlatformsEvaluated] = useState([]);

  const applyStepResult = useCallback((result) => {
    if (result.platform_selection_session_id) {
      setPlatformSelectionSessionId(result.platform_selection_session_id);
    }
    if (result.analysis_session_id) {
      setAnalysisSessionId(result.analysis_session_id);
    }

    if (result.status === 'complete' && result.recommendation) {
      setRecommendation(result.recommendation);
      setPlatformsEvaluated(result.platforms_evaluated || []);
      setConfidence(result.confidence ?? result.recommendation.confidence_score ?? 0);
      setPhase('complete');
      setCurrentQuestion(null);
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          text: result.recommendation.explanation || 'Here is my deployment recommendation based on your project and requirements.',
        },
      ]);
      return;
    }

    if (result.question) {
      setCurrentQuestion(result.question);
      setConfidence(result.confidence ?? 0);
      setKnownFromAnalysis(result.known_from_analysis || []);
      setMessages((prev) => [
        ...prev,
        { role: 'agent', text: result.question.text },
      ]);
      setPhase('interview');
    }
  }, []);

  const runSelectionStep = useCallback(async (sessionId, selectionSessionId, answers) => {
    const result = await platformSelectionStep({
      analysisSessionId: sessionId,
      platformSelectionSessionId: selectionSessionId,
      interviewAnswers: answers,
    });
    applyStepResult(result);
  }, [applyStepResult]);

  useEffect(() => {
    if (!repoUrl && !analysisSessionIdParam) {
      setPhase('empty');
      return;
    }

    let cancelled = false;

    async function bootstrap() {
      setError(null);
      setAnalysisResult(null);
      setMessages([]);
      setInterviewAnswers([]);
      setRecommendation(null);
      setCurrentQuestion(null);
      setAnswerInput('');
      setPlatformSelectionSessionId(null);

      try {
        let sessionId = analysisSessionIdParam;
        let analysisData = null;
        let fromStore = false;

        if (!forceRescan && analysisSessionIdParam) {
          setPhase('loading-interview');
          const stored = await getAnalysisSession({ sessionId: analysisSessionIdParam });
          sessionId = stored.sessionId;
          analysisData = stored.result;
          fromStore = true;
        } else if (!forceRescan && repoUrl) {
          try {
            setPhase('loading-interview');
            const stored = await getAnalysisSession({ url: repoUrl });
            sessionId = stored.sessionId;
            analysisData = stored.result;
            fromStore = true;
          } catch {
            setPhase('loading-analysis');
            const fresh = await getOrAnalyzeRepository(repoUrl, { forceRefresh: false });
            sessionId = fresh.sessionId;
            analysisData = fresh.result;
          }
        } else if (repoUrl) {
          setPhase('loading-analysis');
          const fresh = await getOrAnalyzeRepository(repoUrl, { forceRefresh: true });
          sessionId = fresh.sessionId;
          analysisData = fresh.result;
        } else {
          throw new Error('Repository URL or analysis session is required.');
        }

        if (cancelled) return;

        setAnalysisSessionId(sessionId);
        setAnalysisResult(analysisData);
        setUsedStoredAnalysis(fromStore);
        setPhase('loading-interview');
        setMessages([
          {
            role: 'agent',
            text: 'I reviewed your repository analysis. Let me ask a few questions about your deployment goals before recommending a platform.',
          },
        ]);

        await runSelectionStep(sessionId, null, []);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to start platform selection.');
          setPhase('error');
        }
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  }, [repoUrl, analysisSessionIdParam, forceRescan, runSelectionStep]);

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    if (!currentQuestion || !answerInput.trim() || !analysisSessionId) return;

    const newAnswer = {
      question_id: currentQuestion.id,
      question: currentQuestion.text,
      answer: answerInput.trim(),
    };

    const updatedAnswers = [...interviewAnswers, newAnswer];
    setInterviewAnswers(updatedAnswers);
    setMessages((prev) => [...prev, { role: 'user', text: answerInput.trim() }]);
    setAnswerInput('');
    setCurrentQuestion(null);
    setIsSubmitting(true);
    setPhase('loading-interview');

    try {
      await runSelectionStep(analysisSessionId, platformSelectionSessionId, updatedAnswers);
    } catch (err) {
      setError(err.message || 'Failed to process your answer.');
      setPhase('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildPlatformSelectionUrl = (extra = {}) => {
    const params = new URLSearchParams();
    if (repoUrl) params.set('url', repoUrl);
    if (analysisSessionId) params.set('analysisSessionId', analysisSessionId);
    Object.entries(extra).forEach(([key, value]) => params.set(key, value));
    return `/platform-selection?${params.toString()}`;
  };

  const handleRestart = () => {
    navigate(buildPlatformSelectionUrl());
    window.location.reload();
  };

  const handleReAnalyze = () => {
    navigate(buildPlatformSelectionUrl({ rescan: '1' }));
    window.location.reload();
  };

  return (
    <DashboardLayout>
      <div className="ps-page-wrapper">
        {repoUrl && phase !== 'empty' && (
          <div className="ps-top-actions">
            <button
              type="button"
              className="ps-back-btn"
              onClick={() => navigate(`/repository-analysis?url=${encodeURIComponent(repoUrl)}`)}
            >
              ← Back to Repository Analysis
            </button>
            {usedStoredAnalysis && phase !== 'loading-analysis' && (
              <button type="button" className="ps-reanalyze-btn" onClick={handleReAnalyze}>
                Re-analyze repository
              </button>
            )}
          </div>
        )}

        {phase === 'loading-analysis' && (
          <AnalysisLoader repoUrl={repoUrl} />
        )}

        {phase === 'error' && (
          <div className="ps-error-card">
            <h2>Platform Selection Failed</h2>
            <p>{error}</p>
            <div className="ps-error-actions">
              <button type="button" className="ps-submit-btn" onClick={() => window.location.reload()}>
                Retry
              </button>
              <button type="button" className="ps-secondary-btn" onClick={handleReAnalyze}>
                Re-analyze repository
              </button>
            </div>
          </div>
        )}

        {phase === 'empty' && (
          <div className="ps-empty-card">
            <h2>Platform Selection</h2>
            <p>Analyze a repository first, then select a deployment platform with AI-guided recommendations.</p>
            <button type="button" className="ps-submit-btn" onClick={() => navigate('/repositories')}>
              Go to Repositories
            </button>
          </div>
        )}

        {(phase === 'interview' || phase === 'loading-interview') && analysisResult && !recommendation && (
          <InterviewChat
            messages={messages}
            currentQuestion={currentQuestion}
            answerInput={answerInput}
            onAnswerChange={setAnswerInput}
            onSubmit={handleSubmitAnswer}
            isSubmitting={isSubmitting || phase === 'loading-interview'}
            confidence={confidence}
            knownFromAnalysis={knownFromAnalysis}
          />
        )}

        {phase === 'complete' && recommendation && (
          <div className="ps-complete-layout">
            <RecommendationPanel
              recommendation={recommendation}
              platformsEvaluated={platformsEvaluated}
            />
            <div className="ps-complete-actions">
              <button type="button" className="ps-secondary-btn" onClick={handleRestart}>
                Start New Interview
              </button>
              <button
                type="button"
                className="ps-submit-btn"
                onClick={() => {
                  const params = new URLSearchParams();
                  if (repoUrl) params.set('url', repoUrl);
                  if (analysisSessionId) params.set('analysisSessionId', analysisSessionId);
                  if (platformSelectionSessionId) {
                    params.set('platformSelectionSessionId', platformSelectionSessionId);
                  }
                  navigate(`/architecture-recommendation?${params.toString()}`);
                }}
              >
                View Architecture →
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default PlatformSelection;
