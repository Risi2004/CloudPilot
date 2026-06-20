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
