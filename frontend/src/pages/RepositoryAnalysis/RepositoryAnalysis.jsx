import React, { useState } from 'react';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import './RepositoryAnalysis.css';

// SVG Assets
import analyzeRepositoryIcon from '../../assets/analyze-repository.svg';

function RepositoryAnalysis() {
  const [repoUrl, setRepoUrl] = useState('');

  const handleAnalyze = (e) => {
    e.preventDefault();
    console.log('Analyzing repository:', repoUrl);
  };

  return (
    <DashboardLayout>
      <div className="repo-analysis-wrapper">
        <div className="repo-analysis-content">
          {/* Header Text */}
          <h1 className="repo-title">Repository Analysis</h1>
          <p className="repo-subtitle">
            Upload a repository and let Cloudpilot design the optimal cloud infrastructure for your application with AI-driven multi-agent orchestration.
          </p>

          {/* Form Card */}
          <div className="repo-form-card">
            <form onSubmit={handleAnalyze} className="repo-input-row">
              <div className="repo-url-input-container">
                <span className="repo-url-prefix-icon">
                  {/* Chain link inline SVG */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                </span>
                <input
                  type="url"
                  className="repo-url-input"
                  placeholder="https://github.com/username/repository"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="analyze-btn">
                <img src={analyzeRepositoryIcon} alt="" className="analyze-btn-icon" />
                Analyze Repository
              </button>
            </form>

            <div className="repo-divider">
              <span className="repo-divider-text">OR</span>
            </div>

            <button type="button" className="connect-github-btn" onClick={() => console.log('Connect GitHub')}>
              {/* Terminal inline SVG */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#BBC9CF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="github-btn-icon">
                <rect x="2" y="3" width="20" height="18" rx="2" ry="2"></rect>
                <path d="M7 8l5 4-5 4M13 16h5"></path>
              </svg>
              Connect GitHub
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default RepositoryAnalysis;
