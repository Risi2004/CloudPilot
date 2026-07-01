import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import './ArchitectureRecommendation.css';

import RecommendationHeader from '../../components/ArchitectureRecommendation/RecommendationHeader';
import PlatformCard from '../../components/ArchitectureRecommendation/PlatformCard';
import ArchitectureDiagram from '../../components/ArchitectureRecommendation/ArchitectureDiagram';
import RecommendationDetails from '../../components/ArchitectureRecommendation/RecommendationDetails';
import BlueprintSummary from '../../components/ArchitectureRecommendation/BlueprintSummary';
import DeployableServicesPanel from '../../components/ArchitectureRecommendation/DeployableServicesPanel';
import ArchitectureLoader from '../../components/ArchitectureRecommendation/ArchitectureLoader';
import { generateArchitecture, getArchitectureSession } from '../../services/architecture';

function ArchitectureRecommendation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const repoUrl = searchParams.get('url');
  const analysisSessionId = searchParams.get('analysisSessionId');
  const platformSelectionSessionId = searchParams.get('platformSelectionSessionId');
  const architectureSessionIdParam = searchParams.get('architectureSessionId');
  const forceRefresh = searchParams.get('forceRefresh') === '1';

  const [phase, setPhase] = useState('loading');
  const [error, setError] = useState(null);
  const [blueprint, setBlueprint] = useState(null);
  const [platformsEvaluated, setPlatformsEvaluated] = useState([]);
  const [architectureSessionId, setArchitectureSessionId] = useState(null);
  const [primaryPlatform, setPrimaryPlatform] = useState('');

  useEffect(() => {
    if (!analysisSessionId || !platformSelectionSessionId) {
      setPhase('missing-sessions');
      return;
    }

    let cancelled = false;

    async function bootstrap() {
      setPhase('loading');
      setError(null);

      try {
        let data;
        if (architectureSessionIdParam && !forceRefresh) {
          data = await getArchitectureSession(architectureSessionIdParam);
        } else {
          data = await generateArchitecture({
            analysisSessionId,
            platformSelectionSessionId,
            forceRefresh,
          });
        }

        if (cancelled) return;

        setBlueprint(data.blueprint);
        setPlatformsEvaluated(data.platforms_evaluated || []);
        setArchitectureSessionId(data.architecture_session_id);
        setPrimaryPlatform(
          data.blueprint?.platform_assignment?.[0]?.platform
          || data.blueprint?.deployable_services?.[0]?.platform
          || '',
        );
        setPhase('complete');
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Architecture generation failed.');
          setPhase('error');
        }
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  }, [
    analysisSessionId,
    platformSelectionSessionId,
    architectureSessionIdParam,
    forceRefresh,
  ]);

  const buildPlatformSelectionUrl = () => {
    const params = new URLSearchParams();
    if (repoUrl) params.set('url', repoUrl);
    if (analysisSessionId) params.set('analysisSessionId', analysisSessionId);
    return `/platform-selection?${params.toString()}`;
  };

  const handleRegenerate = () => {
    const params = new URLSearchParams();
    if (repoUrl) params.set('url', repoUrl);
    if (analysisSessionId) params.set('analysisSessionId', analysisSessionId);
    if (platformSelectionSessionId) params.set('platformSelectionSessionId', platformSelectionSessionId);
    params.set('forceRefresh', '1');
    navigate(`/architecture-recommendation?${params.toString()}`);
    window.location.reload();
  };

  return (
    <DashboardLayout>
      <div className="rec-page-wrapper">
        {phase === 'loading' && (
          <ArchitectureLoader repoUrl={repoUrl} />
        )}

        {phase === 'error' && (
          <div className="rec-empty-container">
            <div className="rec-empty-card">
              <h2 className="rec-empty-title">Architecture Generation Failed</h2>
              <p className="rec-empty-desc">{error}</p>
              <button type="button" className="rec-go-back-btn" onClick={handleRegenerate}>
                Retry
              </button>
            </div>
          </div>
        )}

        {phase === 'missing-sessions' && (
          <div className="rec-empty-container">
            <div className="rec-empty-card">
              <h2 className="rec-empty-title">Complete Platform Selection First</h2>
              <p className="rec-empty-desc">
                Architecture generation requires completed repository analysis and platform selection sessions.
              </p>
              <button type="button" className="rec-go-back-btn" onClick={() => navigate(buildPlatformSelectionUrl())}>
                Go to Platform Selection
              </button>
            </div>
          </div>
        )}

        {phase === 'complete' && blueprint && (
          <div className="rec-content-container">
            <button
              type="button"
              className="rec-back-btn"
              onClick={() => navigate(buildPlatformSelectionUrl())}
            >
              ← Back to Platform Selection
            </button>

            <RecommendationHeader repoUrl={repoUrl} />

            <BlueprintSummary blueprint={blueprint} platformsEvaluated={platformsEvaluated} />

            <div className="rec-grid-layout">
              <div className="rec-left-column">
                <PlatformCard blueprint={blueprint} primaryPlatform={primaryPlatform} />
                <RecommendationDetails blueprint={blueprint} />
                <DeployableServicesPanel services={blueprint.deployable_services} />
              </div>
              <div className="rec-right-column">
                <ArchitectureDiagram blueprint={blueprint} />
              </div>
            </div>

            <div className="rec-actions-row">
              <button type="button" className="rec-regenerate-btn" onClick={handleRegenerate}>
                Regenerate Blueprint
              </button>
              {architectureSessionId && (
                <span className="rec-session-id">Session: {architectureSessionId.slice(0, 8)}…</span>
              )}
            </div>

            <div className="rec-cost-banner-cta">
              <div className="rec-cost-banner-left">
                <div className="rec-cost-banner-badge font-mono">COST ESTIMATION AGENT</div>
                <h3 className="rec-cost-banner-title">Curious about the billing estimates for this architecture?</h3>
                <p className="rec-cost-banner-desc">Cost estimation will use this deployment blueprint when implemented.</p>
              </div>
              <button
                type="button"
                className="rec-cost-banner-btn"
                onClick={() => navigate(`/cost-estimation?url=${encodeURIComponent(repoUrl || '')}`)}
              >
                View Cost Estimation Report →
              </button>
            </div>
          </div>
        )}

        {!repoUrl && phase === 'missing-sessions' && (
          <div className="rec-empty-container">
            <div className="rec-empty-card">
              <h2 className="rec-empty-title">Architecture Recommendations</h2>
              <p className="rec-empty-desc">No repository URL selected. Please perform repository analysis first.</p>
              <button type="button" className="rec-go-back-btn" onClick={() => navigate('/repositories')}>
                Go to Repository Analysis
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default ArchitectureRecommendation;
