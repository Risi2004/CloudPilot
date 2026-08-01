import React, { useState } from 'react';

function TabContainerization({ data }) {
  const [activeCodeTab, setActiveCodeTab] = useState('dockerfile');
  const [copied, setCopied] = useState(false);

  const getCodeContent = () => {
    if (activeCodeTab === 'dockerfile') {
      return data.containerization?.dockerfile || '';
    }
    return data.containerization?.dockerCompose || '';
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCodeContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!data.containerization) {
    return (
      <div className="tab-pane-content">
        <div className="tab-pane-header">
          <h3 className="tab-pane-title">Containerization Blueprint</h3>
          <p className="tab-pane-subtitle">Optimal Docker configurations generated based on framework type and dependencies.</p>
        </div>
        <div className="insights-panel">
          <div className="insights-panel-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>
          <div className="insights-panel-text">
            <strong>Not yet analyzed.</strong> Dockerfile and docker-compose generation is handled by the upcoming Containerization Agent, not yet part of this analysis.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-pane-content">
      <div className="tab-pane-header">
        <h3 className="tab-pane-title">Containerization Blueprint</h3>
        <p className="tab-pane-subtitle">Optimal Docker configurations generated based on framework type and dependencies.</p>
      </div>

      <div className="container-code-box">
        {/* Toggle between files */}
        <div className="code-box-header">
          <div className="code-tabs">
            <button
              className={`code-tab-btn ${activeCodeTab === 'dockerfile' ? 'active' : ''}`}
              onClick={() => setActiveCodeTab('dockerfile')}
            >
              Dockerfile
            </button>
            <button
              className={`code-tab-btn ${activeCodeTab === 'compose' ? 'active' : ''}`}
              onClick={() => setActiveCodeTab('compose')}
            >
              docker-compose.yml
            </button>
          </div>

          <button onClick={handleCopy} className="code-copy-btn">
            {copied ? (
              <span className="copied-text">✓ Copied!</span>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>

        {/* Code display screen */}
        <div className="code-display-body">
          <pre className="code-pre">
            <code className="code-inner">{getCodeContent()}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

export default TabContainerization;
