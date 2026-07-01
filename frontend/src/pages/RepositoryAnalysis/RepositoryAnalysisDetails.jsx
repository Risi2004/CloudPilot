import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import './RepositoryAnalysisDetails.css';

import AnalysisLoader from '../../components/RepositoryAnalysis/AnalysisLoader';
import AnalysisHeader from '../../components/RepositoryAnalysis/AnalysisHeader';
import AnalysisSummary from '../../components/RepositoryAnalysis/AnalysisSummary';
import TabAnalysisOverview from '../../components/RepositoryAnalysis/TabAnalysisOverview';
import TabScanFacts from '../../components/RepositoryAnalysis/TabScanFacts';
import TabDeploymentHealth from '../../components/RepositoryAnalysis/TabDeploymentHealth';
import TabRawJson from '../../components/RepositoryAnalysis/TabRawJson';
import { analyzeRepository } from '../../services/repositoryAnalysis';

function RepositoryAnalysisDetails() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const repoUrl = searchParams.get('url');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisSessionId, setAnalysisSessionId] = useState(null);

  useEffect(() => {
    if (!repoUrl) {
      setAnalysisResult(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setAnalysisSessionId(null);
    setActiveTab('overview');

    analyzeRepository(repoUrl)
      .then((data) => {
        if (!cancelled) {
          setAnalysisResult(data.result);
          setAnalysisSessionId(data.sessionId);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Repository analysis failed.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [repoUrl]);

  const handleAnalyzeNew = (newUrl) => {
    navigate(`/repository-analysis?url=${encodeURIComponent(newUrl)}`);
  };

  const renderActiveTab = () => {
    if (!analysisResult) return null;
    switch (activeTab) {
      case 'overview':
        return <TabAnalysisOverview result={analysisResult} />;
      case 'facts':
        return <TabScanFacts result={analysisResult} />;
      case 'deployment':
        return <TabDeploymentHealth result={analysisResult} />;
      case 'json':
        return <TabRawJson result={analysisResult} />;
      default:
        return <TabAnalysisOverview result={analysisResult} />;
    }
  };

  return (
    <DashboardLayout>
      <div className="analysis-details-wrapper">
        {isLoading ? (
          <AnalysisLoader repoUrl={repoUrl} />
        ) : error ? (
          <div className="analysis-error-container">
            <div className="empty-card analysis-error-card">
              <h2 className="empty-title">Analysis Failed</h2>
              <p className="empty-desc">{error}</p>
              <p className="analysis-error-hint">
                Ensure the backend is running, Ollama is available, and the agent-runtime is configured
                (`AGENT_RUNTIME_PYTHON`, `OLLAMA_BASE_URL` in backend `.env`).
              </p>
              {repoUrl && (
                <button type="button" className="empty-submit-btn" onClick={() => window.location.reload()}>
                  Retry Analysis
                </button>
              )}
            </div>
          </div>
        ) : repoUrl && analysisResult ? (
          <div className="analysis-content-container">
            <AnalysisHeader currentUrl={repoUrl} onAnalyzeNew={handleAnalyzeNew} />
            <AnalysisSummary result={analysisResult} />

            <div className="analysis-platform-cta">
              <div className="analysis-platform-cta-text">
                <span className="analysis-platform-cta-badge font-mono">PLATFORM SELECTION AGENT</span>
                <h3>Ready to choose a deployment platform?</h3>
                <p>
                  Get a grounded recommendation for Vercel, Render, or hybrid deployment based on your
                  repository analysis and deployment goals.
                </p>
              </div>
              <button
                type="button"
                className="empty-submit-btn"
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set('url', repoUrl);
                  if (analysisSessionId) params.set('analysisSessionId', analysisSessionId);
                  navigate(`/platform-selection?${params.toString()}`);
                }}
              >
                Start Platform Selection →
              </button>
            </div>

            <div className="analysis-details-tabs-bar">
              <button
                type="button"
                className={`tab-toggle-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <span>AI Overview</span>
              </button>
              <button
                type="button"
                className={`tab-toggle-btn ${activeTab === 'facts' ? 'active' : ''}`}
                onClick={() => setActiveTab('facts')}
              >
                <span>Scan Facts</span>
              </button>
              <button
                type="button"
                className={`tab-toggle-btn ${activeTab === 'deployment' ? 'active' : ''}`}
                onClick={() => setActiveTab('deployment')}
              >
                <span>Deployment & Health</span>
              </button>
              <button
                type="button"
                className={`tab-toggle-btn ${activeTab === 'json' ? 'active' : ''}`}
                onClick={() => setActiveTab('json')}
              >
                <span>Raw JSON</span>
              </button>
            </div>

            <div className="analysis-tab-content-panel">{renderActiveTab()}</div>
          </div>
        ) : (
          <div className="empty-analysis-container">
            <div className="empty-card">
              <div className="empty-icon-wrapper">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z"></path>
                  <path d="M12 16v-4"></path>
                  <path d="M12 8h.01"></path>
                </svg>
              </div>
              <h2 className="empty-title">Analyze Repository</h2>
              <p className="empty-desc">
                Enter a GitHub repository URL to run the CloudPilot repository analysis agent.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const val = e.target.elements.repoUrlInput.value;
                  if (val.trim()) handleAnalyzeNew(val.trim());
                }}
                className="empty-form"
              >
                <input
                  type="url"
                  name="repoUrlInput"
                  placeholder="https://github.com/username/repository"
                  className="empty-input"
                  required
                />
                <button type="submit" className="empty-submit-btn">
                  Analyze Repository
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default RepositoryAnalysisDetails;
