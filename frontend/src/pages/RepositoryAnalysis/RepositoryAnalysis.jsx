import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import './RepositoryAnalysis.css';

// SVG Assets
import analyzeRepositoryIcon from '../../assets/analyze-repository.svg';
import githubIcon from '../../assets/github.svg';

function RepositoryAnalysis() {
  const [repoUrl, setRepoUrl] = useState('');
  const navigate = useNavigate();

  const handleAnalyze = (e) => {
    e.preventDefault();
    if (repoUrl.trim()) {
      navigate(`/repository-analysis?url=${encodeURIComponent(repoUrl.trim())}`);
    }
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
              <img src={githubIcon} alt="GitHub" className="github-btn-icon" />
              Connect GitHub
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default RepositoryAnalysis;
