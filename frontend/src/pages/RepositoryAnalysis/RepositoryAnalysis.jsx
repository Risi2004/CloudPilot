import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import GitHubRepoList from '../../components/RepositoryAnalysis/GitHubRepoList';
import {
  connectGitHub,
  disconnectGitHub,
  getGitHubStatus,
  listGitHubRepos,
} from '../../services/github';
import './RepositoryAnalysis.css';

import analyzeRepositoryIcon from '../../assets/analyze-repository.svg';
import githubIcon from '../../assets/github.svg';

function RepositoryAnalysis() {
  const [repoUrl, setRepoUrl] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [githubConnected, setGithubConnected] = useState(false);
  const [githubUsername, setGithubUsername] = useState(null);
  const [repos, setRepos] = useState([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadRepos = useCallback(async () => {
    setReposLoading(true);
    setErrorMessage(null);
    try {
      const data = await listGitHubRepos();
      setRepos(data.repos || []);
    } catch (err) {
      setRepos([]);
      setErrorMessage(err.message || 'Failed to load GitHub repositories.');
      if (err.message?.includes('not connected') || err.message?.includes('connect GitHub again')) {
        setGithubConnected(false);
        setGithubUsername(null);
      }
    } finally {
      setReposLoading(false);
    }
  }, []);

  const refreshGitHubStatus = useCallback(async () => {
    try {
      const status = await getGitHubStatus();
      setGithubConnected(Boolean(status.connected));
      setGithubUsername(status.username);
      if (status.connected) {
        await loadRepos();
      } else {
        setRepos([]);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to check GitHub connection.');
    }
  }, [loadRepos]);

  useEffect(() => {
    refreshGitHubStatus();
  }, [refreshGitHubStatus]);

  useEffect(() => {
    const githubParam = searchParams.get('github');
    const messageParam = searchParams.get('message');

    if (githubParam === 'connected') {
      setStatusMessage('GitHub connected successfully.');
      setGithubConnected(true);
      refreshGitHubStatus();
      setSearchParams({}, { replace: true });
    } else if (githubParam === 'error') {
      setErrorMessage(decodeURIComponent(messageParam || 'GitHub connection failed.'));
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, refreshGitHubStatus]);

  const handleAnalyze = (e) => {
    e.preventDefault();
    if (repoUrl.trim()) {
      navigate(`/repository-analysis?url=${encodeURIComponent(repoUrl.trim())}`);
    }
  };

  const handleConnectGitHub = async () => {
    setConnecting(true);
    setErrorMessage(null);
    try {
      await connectGitHub();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to start GitHub connection.');
      setConnecting(false);
    }
  };

  const handleDisconnectGitHub = async () => {
    try {
      await disconnectGitHub();
      setGithubConnected(false);
      setGithubUsername(null);
      setRepos([]);
      setStatusMessage('GitHub disconnected.');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to disconnect GitHub.');
    }
  };

  const handleSelectRepo = (url) => {
    navigate(`/repository-analysis?url=${encodeURIComponent(url)}`);
  };

  return (
    <DashboardLayout>
      <div className="repo-analysis-wrapper">
        <div className="repo-analysis-content repo-analysis-content-wide">
          <h1 className="repo-title">Repository Analysis</h1>
          <p className="repo-subtitle">
            Enter a GitHub repository URL or connect your GitHub account to browse and analyze your repositories.
          </p>

          <div className="repo-form-card">
            <form onSubmit={handleAnalyze} className="repo-input-row">
              <div className="repo-url-input-container">
                <span className="repo-url-prefix-icon">
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

            {githubConnected ? (
              <div className="github-connected-banner">
                <span>Connected as @{githubUsername}</span>
                <button type="button" onClick={handleDisconnectGitHub}>
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="connect-github-btn"
                onClick={handleConnectGitHub}
                disabled={connecting}
              >
                <img src={githubIcon} alt="GitHub" className="github-btn-icon" />
                {connecting ? 'Redirecting to GitHub…' : 'Connect GitHub'}
              </button>
            )}
          </div>

          {statusMessage && <p className="github-status-success">{statusMessage}</p>}
          {errorMessage && <p className="github-status-error">{errorMessage}</p>}

          {(githubConnected || reposLoading || repos.length > 0) && (
            <GitHubRepoList
              repos={repos}
              loading={reposLoading}
              onSelectRepo={handleSelectRepo}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default RepositoryAnalysis;
