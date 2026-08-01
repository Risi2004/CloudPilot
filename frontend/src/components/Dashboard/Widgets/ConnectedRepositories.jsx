import React from 'react';
import githubIcon from '../../../assets/github.svg';
import './ConnectedRepositories.css';

function formatRelativeTime(dateString) {
  try {
    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 0) return 'just now';
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins || 1} min${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } catch {
    return 'recently';
  }
}

function ConnectedRepositories({ analyses = [] }) {
  const handleConnectNew = () => {
    window.location.href = '/repositories';
  };

  const uniqueReposMap = new Map();
  analyses.forEach((analysis) => {
    if (!uniqueReposMap.has(analysis.repoUrl)) {
      uniqueReposMap.set(analysis.repoUrl, analysis);
    }
  });
  const reposList = Array.from(uniqueReposMap.values());

  return (
    <section className="widget-card connected-repos-card">
      <div className="widget-header">
        <div className="widget-header-title">
          <svg className="widget-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          <h3>Connected Repositories</h3>
        </div>
        <button 
          id="btn-connect-new-repo"
          className="widget-action-btn" 
          onClick={handleConnectNew}
        >
          + Connect New
        </button>
      </div>

      <div className="repos-list">
        {reposList.length === 0 ? (
          <div className="empty-widget-state">
            <p>No repositories connected yet.</p>
          </div>
        ) : (
          reposList.map((repo) => (
            <div key={repo._id} className="repo-row" onClick={() => window.location.href = `/repositories?url=${encodeURIComponent(repo.repoUrl)}`} style={{ cursor: 'pointer' }}>
              <div className="repo-info">
                <img src={githubIcon} alt="GitHub" className="repo-git-icon" />
                <div className="repo-details">
                  <span className="repo-name">{repo.repoFullName || repo.repoUrl.split('/').slice(-2).join('/')}</span>
                  <div className="repo-meta">
                    <span className="repo-branch">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="6" y1="3" x2="6" y2="15"></line>
                        <circle cx="18" cy="6" r="3"></circle>
                        <circle cx="6" cy="18" r="3"></circle>
                        <path d="M18 9a9 9 0 0 1-9 9"></path>
                      </svg>
                      main
                    </span>
                    <span className="repo-time">• Scanned {formatRelativeTime(repo.updatedAt)}</span>
                  </div>
                </div>
              </div>
              <div className="repo-status-container">
                <span className="status-pill synced">
                  <span className="status-dot"></span>
                  Synced
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default ConnectedRepositories;
