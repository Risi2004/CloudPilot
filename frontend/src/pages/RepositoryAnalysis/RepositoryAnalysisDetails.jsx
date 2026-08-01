import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import './RepositoryAnalysisDetails.css';

// Subcomponents
import AnalysisLoader from '../../components/RepositoryAnalysis/AnalysisLoader';
import AnalysisHeader from '../../components/RepositoryAnalysis/AnalysisHeader';
import AnalysisSummary from '../../components/RepositoryAnalysis/AnalysisSummary';
import TabArchitectureOverview from '../../components/RepositoryAnalysis/TabArchitectureOverview';
import TabCoreFeatures from '../../components/RepositoryAnalysis/TabCoreFeatures';
import TabDependencies from '../../components/RepositoryAnalysis/TabDependencies';
import TabContainerization from '../../components/RepositoryAnalysis/TabContainerization';
import TabCloudInfrastructure from '../../components/RepositoryAnalysis/TabCloudInfrastructure';
import EnvUploadPrompt from '../../components/RepositoryAnalysis/EnvUploadPrompt';
import DeploymentReadinessReport from '../../components/RepositoryAnalysis/DeploymentReadinessReport';
import TabPlatformSelection from '../../components/RepositoryAnalysis/TabPlatformSelection';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function RepositoryAnalysisDetails() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const repoUrl = searchParams.get('url');

  const [isLoading, setIsLoading] = useState(false);
  const [envStepComplete, setEnvStepComplete] = useState(false);
  const [savedEnvVariables, setSavedEnvVariables] = useState([]);
  const [readinessAcknowledged, setReadinessAcknowledged] = useState(false);
  const [deploymentReadiness, setDeploymentReadiness] = useState(null);
  const [activeTab, setActiveTab] = useState('architecture');
  const [analysisData, setAnalysisData] = useState(null);
  const [error, setError] = useState(null);
  const [interviewStatus, setInterviewStatus] = useState(null);

  // Guards against two failure modes with the same root cause: React
  // StrictMode double-invoking this effect in dev (firing two concurrent
  // analyze requests), and a user navigating to a different repo before the
  // previous analyze request has resolved. Either way, whichever response
  // lands last used to win and silently overwrite the UI with a stale or
  // wrong repo's data - each call now stamps a request id, aborts its fetch
  // if superseded, and any response that isn't still the latest is ignored.
  const latestRequestIdRef = useRef(0);

  const runAnalysis = async (url, force = false, signal) => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    const isStale = () => latestRequestIdRef.current !== requestId;

    setIsLoading(true);
    setError(null);

    try {
      const appToken = localStorage.getItem('token');
      const githubToken = localStorage.getItem('github_token');

      const response = await fetch(`${API_URL}/api/analysis/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${appToken}`,
        },
        body: JSON.stringify({ repoUrl: url, githubToken, force }),
        signal,
      });

      const payload = await response.json();
      if (isStale()) return;
      if (!response.ok) {
        throw new Error(payload.message || 'Failed to analyze repository.');
      }

      setAnalysisData(payload.result);
      setSavedEnvVariables(payload.envVariables || []);
      setEnvStepComplete(Boolean(payload.envConfigured));
      setDeploymentReadiness(payload.deploymentReadiness || null);
      setReadinessAcknowledged(false);

      // Pre-fetch platform selection interview status
      try {
        const interviewResponse = await fetch(`${API_URL}/api/platform-selection?repoUrl=${encodeURIComponent(url)}`, {
          headers: {
            Authorization: `Bearer ${appToken}`,
          },
          signal,
        });
        if (isStale()) return;
        if (interviewResponse.ok) {
          const interviewPayload = await interviewResponse.json();
          if (isStale()) return;
          if (interviewPayload.interview) {
            setInterviewStatus(interviewPayload.interview.status);
          } else {
            setInterviewStatus(null);
          }
        }
      } catch (err) {
        if (!isStale()) console.error('Failed to pre-fetch interview status:', err);
      }
    } catch (err) {
      if (isStale() || err.name === 'AbortError') return;
      console.error(err);
      setError(err.message);
      setAnalysisData(null);
    } finally {
      if (!isStale()) setIsLoading(false);
    }
  };

  // Trigger a real analysis run whenever the url query changes
  useEffect(() => {
    const controller = new AbortController();
    if (repoUrl) {
      setEnvStepComplete(false);
      setSavedEnvVariables([]);
      setReadinessAcknowledged(false);
      setDeploymentReadiness(null);
      setAnalysisData(null);
      setInterviewStatus(null);
      setActiveTab('architecture');
      runAnalysis(repoUrl, false, controller.signal);
    } else {
      setEnvStepComplete(false);
      setSavedEnvVariables([]);
      setReadinessAcknowledged(false);
      setDeploymentReadiness(null);
      setIsLoading(false);
      setAnalysisData(null);
      setError(null);
      setInterviewStatus(null);
    }
    return () => controller.abort();
  }, [repoUrl]);

  const handleAnalyzeNew = (newUrl) => {
    navigate(`/repositories?url=${encodeURIComponent(newUrl)}`);
  };

  const handleRetry = () => {
    if (repoUrl) runAnalysis(repoUrl);
  };

  const renderActiveTab = () => {
    if (!analysisData) return null;
    switch (activeTab) {
      case 'architecture':
        return <TabArchitectureOverview data={analysisData} />;
      case 'features':
        return <TabCoreFeatures data={analysisData} />;
      case 'dependencies':
        return <TabDependencies data={analysisData} />;
      case 'container':
        return <TabContainerization data={analysisData} />;
      case 'infra':
        return <TabCloudInfrastructure data={analysisData} />;
      case 'platform':
        return (
          <TabPlatformSelection 
            repoUrl={repoUrl} 
            onBack={() => setActiveTab('architecture')} 
            onStatusChange={setInterviewStatus} 
          />
        );
      default:
        return <TabArchitectureOverview data={analysisData} />;
    }
  };

  const envVariables = analysisData?.buildRequirements?.envVariables || [];
  // Lets the env upload step offer one section per deployable component
  // (e.g. "Frontend"/"Backend") instead of always dumping every detected
  // variable into one flat list - excludes managed datastores, since there's
  // nothing to "upload an env file" for those.
  const scopeOptions = (analysisData?.architecture?.components || [])
    .map((c) => c.name)
    .filter((name) => name && !/postgres|database|mysql|mongo|redis|cache|datastore/i.test(name));

  return (
    <DashboardLayout>
      <div className="analysis-details-wrapper">
        {repoUrl && isLoading ? (
          <AnalysisLoader repoUrl={repoUrl} />
        ) : repoUrl && error ? (
          <div className="empty-analysis-container">
            <div className="empty-card">
              <div className="empty-icon-wrapper">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <h2 className="empty-title">Analysis Failed</h2>
              <p className="empty-desc">{error}</p>
              <button type="button" className="empty-submit-btn" onClick={handleRetry}>
                Retry Analysis
              </button>
            </div>
          </div>
        ) : repoUrl && analysisData && envVariables.length > 0 && !envStepComplete ? (
          <EnvUploadPrompt
            repoUrl={repoUrl}
            envVariables={envVariables}
            savedValues={savedEnvVariables}
            scopeOptions={scopeOptions}
            onComplete={(updatedEnvVariables) => {
              setSavedEnvVariables(updatedEnvVariables || []);
              setEnvStepComplete(true);
            }}
          />
        ) : repoUrl && analysisData && deploymentReadiness && !readinessAcknowledged ? (
          <DeploymentReadinessReport
            data={deploymentReadiness}
            onContinue={() => {
              setReadinessAcknowledged(true);
              setActiveTab('platform');
            }}
          />
        ) : repoUrl && analysisData ? (
          <div className="analysis-content-container">
            {/* Top Search & Details Header */}
            <AnalysisHeader 
              currentUrl={repoUrl} 
              onAnalyzeNew={handleAnalyzeNew} 
              onPlatformSelectClick={() => setActiveTab('platform')}
              interviewStatus={interviewStatus}
              activeTab={activeTab}
            />

            {/* General Metrics summary cards */}
            {analysisData && <AnalysisSummary data={analysisData} />}

            {/* Tab Toggles Bar */}
            <div className="analysis-details-tabs-bar">
              <button
                className={`tab-toggle-btn ${activeTab === 'architecture' ? 'active' : ''}`}
                onClick={() => setActiveTab('architecture')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <path d="M12 22.08V12"></path>
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                </svg>
                <span>Architecture Overview</span>
              </button>

              <button
                className={`tab-toggle-btn ${activeTab === 'features' ? 'active' : ''}`}
                onClick={() => setActiveTab('features')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                </svg>
                <span>Core Features</span>
              </button>

              <button
                className={`tab-toggle-btn ${activeTab === 'dependencies' ? 'active' : ''}`}
                onClick={() => setActiveTab('dependencies')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z"></path>
                  <path d="M12 6v6l4 2"></path>
                </svg>
                <span>Dependencies & Build</span>
              </button>

              <button
                className={`tab-toggle-btn ${activeTab === 'container' ? 'active' : ''}`}
                onClick={() => setActiveTab('container')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>Containerization</span>
              </button>

              <button
                className={`tab-toggle-btn ${activeTab === 'infra' ? 'active' : ''}`}
                onClick={() => setActiveTab('infra')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 2 22 22 22"></polygon>
                </svg>
                <span>Infrastructure & IaC</span>
              </button>
            </div>

            {/* Display active detailed panel */}
            <div className="analysis-tab-content-panel">
              {renderActiveTab()}
            </div>
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
              <p className="empty-desc">No repository URL selected. Enter a GitHub repo URL below to launch CloudPilot telemetry profiling.</p>

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
