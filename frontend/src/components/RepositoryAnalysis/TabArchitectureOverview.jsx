import React from 'react';

function TabArchitectureOverview({ data }) {
  const architecture = data.architecture || {};
  const components = architecture.components || [];
  const entryPoints = architecture.entryPoints || [];
  const detectedFiles = data.detectedFiles || [];

  return (
    <div className="tab-pane-content">
      <div className="tab-pane-header">
        <h3 className="tab-pane-title">Architecture Overview</h3>
        <p className="tab-pane-subtitle">Autonomous Code Analysis Agent findings on this repository's structure and design.</p>
      </div>

      <div className="runtime-specs-container">
        <div className="runtime-spec-box">
          <span className="spec-label">APPLICATION TYPE</span>
          <span className="spec-value">{architecture.type || 'Not detected'}</span>
        </div>
        <div className="runtime-spec-box">
          <span className="spec-label">ARCHITECTURE PATTERN</span>
          <span className="spec-value">{architecture.pattern || 'Not detected'}</span>
        </div>
      </div>

      {architecture.summary && (
        <div className="insights-panel mt-20">
          <div className="insights-panel-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>
          <div className="insights-panel-text">{architecture.summary}</div>
        </div>
      )}

      {components.length > 0 && (
        <div className="mt-20">
          <h4 className="section-sub-title">Key Components</h4>
          <div className="features-list mt-20">
            {components.map((comp, index) => (
              <div key={index} className="feature-item-card">
                <div className="feature-item-status-wrapper">
                  <span className="feature-status-badge active">{comp.role}</span>
                  <h4 className="feature-item-title">{comp.name}</h4>
                </div>
                <p className="feature-item-desc">{comp.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {entryPoints.length > 0 && (
        <div className="mt-20">
          <h4 className="section-sub-title">Entry Points</h4>
          <div className="deps-manifest-grid">
            {entryPoints.map((entry, index) => (
              <div key={index} className="dep-manifest-card">
                <span className="dep-manifest-name font-mono">{entry}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {detectedFiles.length > 0 && (
        <div className="mt-20">
          <h4 className="section-sub-title">Files Scanned by the Code Analysis Agent</h4>
          <div className="deps-manifest-grid">
            {detectedFiles.map((file, index) => (
              <div key={index} className="dep-manifest-card">
                <span className="dep-manifest-name font-mono">{file}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TabArchitectureOverview;
