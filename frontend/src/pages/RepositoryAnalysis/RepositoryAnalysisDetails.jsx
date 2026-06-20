import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import './RepositoryAnalysisDetails.css';

// Subcomponents
import AnalysisLoader from '../../components/RepositoryAnalysis/AnalysisLoader';
import AnalysisHeader from '../../components/RepositoryAnalysis/AnalysisHeader';
import AnalysisSummary from '../../components/RepositoryAnalysis/AnalysisSummary';
import TabCoreFeatures from '../../components/RepositoryAnalysis/TabCoreFeatures';
import TabDependencies from '../../components/RepositoryAnalysis/TabDependencies';
import TabContainerization from '../../components/RepositoryAnalysis/TabContainerization';
import TabCloudInfrastructure from '../../components/RepositoryAnalysis/TabCloudInfrastructure';
import EnvUploadPrompt from '../../components/RepositoryAnalysis/EnvUploadPrompt';

// Helper mock data resolver
import { getAnalysisResult } from './mockData';

function RepositoryAnalysisDetails() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const repoUrl = searchParams.get('url');

  const [isLoading, setIsLoading] = useState(false);
  const [envStepComplete, setEnvStepComplete] = useState(false);
  const [activeTab, setActiveTab] = useState('features');
  const [analysisData, setAnalysisData] = useState(null);

  // Trigger config setup if url query changes
  useEffect(() => {
    if (repoUrl) {
      setEnvStepComplete(false);
      setIsLoading(false);
      setAnalysisData(getAnalysisResult(repoUrl));
    } else {
      setEnvStepComplete(false);
      setIsLoading(false);
      setAnalysisData(null);
    }
  }, [repoUrl]);

  const handleAnalyzeNew = (newUrl) => {
    navigate(`/repository-analysis?url=${encodeURIComponent(newUrl)}`);
  };

  const renderActiveTab = () => {
    if (!analysisData) return null;
    switch (activeTab) {
      case 'features':
        return <TabCoreFeatures data={analysisData} />;
      case 'dependencies':
        return <TabDependencies data={analysisData} />;
      case 'container':
        return <TabContainerization data={analysisData} />;
      case 'infra':
        return <TabCloudInfrastructure data={analysisData} />;
      default:
        return <TabCoreFeatures data={analysisData} />;
    }
  };

  return (
    <DashboardLayout>
      <div className="analysis-details-wrapper">
        {repoUrl && !envStepComplete ? (
          analysisData && (
            <EnvUploadPrompt
              repoUrl={repoUrl}
              envVariables={analysisData.buildRequirements.envVariables}
              onComplete={() => {
                setEnvStepComplete(true);
                setIsLoading(true);
              }}
            />
          )
        ) : isLoading ? (
          <AnalysisLoader repoUrl={repoUrl} onComplete={() => setIsLoading(false)} />
        ) : repoUrl ? (
          <div className="analysis-content-container">
            {/* Top Search & Details Header */}
            <AnalysisHeader currentUrl={repoUrl} onAnalyzeNew={handleAnalyzeNew} />

            {/* General Metrics summary cards */}
            {analysisData && <AnalysisSummary data={analysisData} />}

            {/* Tab Toggles Bar */}
            <div className="analysis-details-tabs-bar">
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
