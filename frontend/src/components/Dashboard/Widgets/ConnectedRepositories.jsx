import React from 'react';
import githubIcon from '../../../assets/github.svg';
import './ConnectedRepositories.css';

const MOCK_REPOSITORIES = [
  {
    id: 'repo-1',
    name: 'Risi2004/CloudPilot',
    branch: 'main',
    status: 'Synced',
    lastAnalyzed: '2 hours ago',
  },
  {
    id: 'repo-2',
    name: 'facebook/react',
    branch: 'main',
    status: 'Synced',
    lastAnalyzed: '1 day ago',
  },
  {
    id: 'repo-3',
    name: 'kubernetes/kubernetes',
    branch: 'master',
    status: 'Syncing',
    lastAnalyzed: 'Analyzing...',
  },
];

function ConnectedRepositories() {
  const handleConnectNew = () => {
    console.log('Connecting new repository...');
    alert('Connect repository feature coming soon!');
  };

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
        {MOCK_REPOSITORIES.map((repo) => (
          <div key={repo.id} className="repo-row">
            <div className="repo-info">
              <img src={githubIcon} alt="GitHub" className="repo-git-icon" />
              <div className="repo-details">
                <span className="repo-name">{repo.name}</span>
                <div className="repo-meta">
                  <span className="repo-branch">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="6" y1="3" x2="6" y2="15"></line>
                      <circle cx="18" cy="6" r="3"></circle>
                      <circle cx="6" cy="18" r="3"></circle>
                      <path d="M18 9a9 9 0 0 1-9 9"></path>
                    </svg>
                    {repo.branch}
                  </span>
                  <span className="repo-time">• Analyzed {repo.lastAnalyzed}</span>
                </div>
              </div>
            </div>
            <div className="repo-status-container">
              <span className={`status-pill ${repo.status.toLowerCase()}`}>
                <span className="status-dot"></span>
                {repo.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ConnectedRepositories;
