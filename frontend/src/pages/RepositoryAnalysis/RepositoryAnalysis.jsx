import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import RepositoryAnalysisDetails from './RepositoryAnalysisDetails';
import './RepositoryAnalysis.css';

// SVG Assets
import analyzeRepositoryIcon from '../../assets/analyze-repository.svg';
import githubIcon from '../../assets/github.svg';

function RepositoryAnalysis() {
  const params = new URLSearchParams(window.location.search);
  const repoUrlParam = params.get('url');

  if (repoUrlParam) {
    return <RepositoryAnalysisDetails />;
  }
  const [repoUrl, setRepoUrl] = useState('');
  const [githubToken, setGithubToken] = useState(localStorage.getItem('github_token') || '');
  const [repos, setRepos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();

  // Handle callback token from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('github_token');
    let currentToken = githubToken;
    
    if (tokenFromUrl) {
      localStorage.setItem('github_token', tokenFromUrl);
      setGithubToken(tokenFromUrl);
      currentToken = tokenFromUrl;
      // Clean up the token from address bar
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (currentToken) {
      fetchRepositories(currentToken);
    }
  }, [githubToken]);

  const fetchRepositories = async (token) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('github_token');
          setGithubToken('');
          throw new Error('GitHub connection expired or invalid. Please reconnect.');
        }
        throw new Error('Failed to fetch repositories from GitHub.');
      }
      const data = await response.json();
      setRepos(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = (e) => {
    e.preventDefault();
    if (repoUrl.trim()) {
      navigate(`/repositories?url=${encodeURIComponent(repoUrl.trim())}`);
    }
  };

  const handleConnectGitHub = () => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    window.location.href = `${API_URL}/api/github/login`;
  };

  const handleDisconnect = () => {
    localStorage.removeItem('github_token');
    setGithubToken('');
    setRepos([]);
    setError(null);
  };

  const getLanguageColor = (lang) => {
    const colors = {
      JavaScript: '#f1e05a',
      TypeScript: '#3178c6',
      Python: '#3572A5',
      HTML: '#e34c26',
      CSS: '#563d7c',
      Java: '#b07219',
      Go: '#00ADD8',
      Rust: '#dea584',
      Ruby: '#701516',
      PHP: '#4F5D95',
      'C++': '#f34b7d',
      C: '#555555',
      'C#': '#178600'
    };
    return colors[lang] || '#64748b';
  };

  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="repo-analysis-wrapper">
        <div className="repo-analysis-content">
          {/* Header Text */}
          <h1 className="repo-title">Repository Analysis</h1>
          <p className="repo-subtitle">
            Upload a repository and let Cloudpilot design the optimal cloud infrastructure for your application with AI-driven multi-agent orchestration.
          </p>

          {!githubToken ? (
            /* Connected state input form */
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

              <button type="button" className="connect-github-btn" onClick={handleConnectGitHub}>
                <img src={githubIcon} alt="GitHub" className="github-btn-icon" />
                Connect GitHub
              </button>
            </div>
          ) : (
            /* Connected Repositories Selection UI */
            <div className="repo-form-card repos-list-card">
              <div className="repos-header-row">
                <h3 className="repos-section-title">Select a GitHub Repository</h3>
                <button onClick={handleDisconnect} className="disconnect-github-btn">
                  Disconnect
                </button>
              </div>

              <div className="repo-search-container">
                <span className="repo-url-prefix-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </span>
                <input
                  type="text"
                  className="repo-url-input"
                  placeholder="Search repositories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {loading ? (
                <div className="repos-loading-container">
                  <div className="repos-spinner"></div>
                  <p className="repos-loading-text">Fetching your GitHub repositories...</p>
                </div>
              ) : error ? (
                <div className="repos-error-container">
                  <p className="repos-error-text">{error}</p>
                  <button onClick={() => fetchRepositories(githubToken)} className="retry-btn">
                    Retry
                  </button>
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="repos-empty-container">
                  <p className="repos-empty-text">No repositories found.</p>
                </div>
              ) : (
                <div className="repos-list-container">
                  {filteredRepos.map((repo) => (
                    <div key={repo.id} className="repo-item-card">
                      <div className="repo-info-col">
                        <div className="repo-name-row">
                          <span className="repo-name-text">{repo.name}</span>
                          <span className={`repo-badge ${repo.private ? 'private' : 'public'}`}>
                            {repo.private ? 'Private' : 'Public'}
                          </span>
                        </div>
                        {repo.description && (
                          <p className="repo-description">{repo.description}</p>
                        )}
                        <div className="repo-meta-row">
                          {repo.language && (
                            <span className="repo-language">
                              <span
                                className="language-dot"
                                style={{ backgroundColor: getLanguageColor(repo.language) }}
                              ></span>
                              {repo.language}
                            </span>
                          )}
                          <span>
                            Updated {new Date(repo.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="repo-btn-col">
                        <button
                          onClick={() => navigate(`/repositories?url=${encodeURIComponent(repo.html_url)}`)}
                          className="select-repo-btn"
                        >
                          Analyze
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default RepositoryAnalysis;
