import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import './ArchitectureRecommendation.css';

// Subcomponents
import RecommendationHeader from '../../components/ArchitectureRecommendation/RecommendationHeader';
import ArchitectureOptionsGrid from '../../components/ArchitectureRecommendation/ArchitectureOptionsGrid';
import ArchitectureOptionDetail from '../../components/ArchitectureRecommendation/ArchitectureOptionDetail';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

function ArchitectureRecommendation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const repoUrl = searchParams.get('url');

  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [selectedOptionId, setSelectedOptionId] = useState(null);

  // Same fix as the repository analysis page: without this, React StrictMode
  // double-invoking the effect below (or the user re-triggering generation
  // before a prior call resolves) fires two concurrent, expensive RunPod
  // generation calls, and whichever response lands last silently wins - even
  // if it's for a stale repoUrl. Stamping each call with a request id and
  // ignoring any response that isn't still the latest makes that impossible.
  const latestRequestIdRef = useRef(0);

  const loadOrGenerate = useCallback(async (regenerate = false, signal) => {
    if (!repoUrl) return;
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    const isStale = () => latestRequestIdRef.current !== requestId;

    setLoading(!regenerate);
    setGenerating(regenerate);
    setError(null);

    try {
      if (!regenerate) {
        const getRes = await fetch(`${API_URL}/api/architecture?repoUrl=${encodeURIComponent(repoUrl)}`, {
          headers: authHeaders(),
          signal,
        });
        const getPayload = await getRes.json();
        if (isStale()) return;
        if (!getRes.ok) throw new Error(getPayload.message || 'Failed to load architecture options.');

        if (getPayload.recommendation) {
          setRecommendation(getPayload.recommendation);
          const result = getPayload.recommendation.result || {};
          setSelectedOptionId(result.recommendedOptionId || (result.options && result.options[0] && result.options[0].id) || null);
          setLoading(false);
          return;
        }
      }

      const genRes = await fetch(`${API_URL}/api/architecture/generate`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ repoUrl, regenerate }),
        signal,
      });
      const genPayload = await genRes.json();
      if (isStale()) return;
      if (!genRes.ok) throw new Error(genPayload.message || 'Failed to generate architecture options.');

      setRecommendation(genPayload.recommendation);
      const result = genPayload.recommendation.result || {};
      setSelectedOptionId(result.recommendedOptionId || (result.options && result.options[0] && result.options[0].id) || null);
    } catch (err) {
      if (isStale() || err.name === 'AbortError') return;
      console.error(err);
      setError(err.message);
    } finally {
      if (!isStale()) {
        setLoading(false);
        setGenerating(false);
      }
    }
  }, [repoUrl]);

  useEffect(() => {
    const controller = new AbortController();
    setRecommendation(null);
    setSelectedOptionId(null);
    if (repoUrl) loadOrGenerate(false, controller.signal);
    return () => controller.abort();
  }, [repoUrl, loadOrGenerate]);

  const result = recommendation && recommendation.result;
  const options = (result && result.options) || [];
  const selectedOption = options.find((o) => o.id === selectedOptionId) || options[0];

  return (
    <DashboardLayout>
      <div className="rec-page-wrapper">
        {repoUrl ? (
          <div className="rec-content-container">
            <button
              type="button"
              className="rec-back-btn"
              onClick={() => navigate(`/repositories?url=${encodeURIComponent(repoUrl)}`)}
            >
              ← Back to Repository Analysis
            </button>

            <RecommendationHeader repoUrl={repoUrl} />

            {(loading || generating) && (
              <div className="rec-loading-state">
                <div className="rec-loading-spinner"></div>
                <span>{generating ? 'Regenerating architecture options...' : 'Generating architecture options...'}</span>
              </div>
            )}

            {!loading && error && (
              <div className="rec-error-banner">
                {error}
              </div>
            )}

            {!loading && !error && result && (
              <>
                {result.message && <p className="rec-lead-message">{result.message}</p>}

                <ArchitectureOptionsGrid
                  options={options}
                  recommendedOptionId={result.recommendedOptionId}
                  selectedId={selectedOptionId}
                  onSelect={setSelectedOptionId}
                />

                <ArchitectureOptionDetail option={selectedOption} repoUrl={repoUrl} />

                <button
                  type="button"
                  className="rec-regenerate-btn"
                  disabled={generating}
                  onClick={() => loadOrGenerate(true)}
                >
                  Regenerate Options
                </button>

                <div className="rec-cost-banner-cta">
                  <div className="rec-cost-banner-left">
                    <div className="rec-cost-banner-badge font-mono">COST ESTIMATION AGENT</div>
                    <h3 className="rec-cost-banner-title">Curious about the billing estimates for this architecture?</h3>
                    <p className="rec-cost-banner-desc">Our Cost Estimation Agent has calculated the resource-by-resource costs, cheaper alternatives, and multi-provider comparisons.</p>
                  </div>
                  <button
                    type="button"
                    className="rec-cost-banner-btn"
                    onClick={() => navigate(`/cost-estimation?url=${encodeURIComponent(repoUrl)}`)}
                  >
                    View Cost Estimation Report →
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="rec-empty-container">
            <div className="rec-empty-card">
              <h2 className="rec-empty-title">Architecture Recommendations</h2>
              <p className="rec-empty-desc">No repository URL selected. Please perform repository scans first.</p>
              <button
                type="button"
                className="rec-go-back-btn"
                onClick={() => navigate('/repositories')}
              >
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
