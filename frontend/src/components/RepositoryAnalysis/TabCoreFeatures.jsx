import React from 'react';

function TabCoreFeatures({ data }) {
  return (
    <div className="tab-pane-content">
      <div className="tab-pane-header">
        <h3 className="tab-pane-title">Core Application Features</h3>
        <p className="tab-pane-subtitle">Autonomous scanners identified the following core application logic blocks and service integrations.</p>
      </div>

      <div className="features-list">
        {data.coreFeatures?.map((feat, index) => (
          <div key={index} className="feature-item-card">
            <div className="feature-item-meta">
              <div className="feature-item-status-wrapper">
                <span className={`feature-status-badge ${feat.status.toLowerCase()}`}>{feat.status}</span>
                <h4 className="feature-item-title">{feat.title}</h4>
              </div>
              <p className="feature-item-desc">{feat.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="insights-panel mt-20">
        <div className="insights-panel-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </div>
        <div className="insights-panel-text">
          <strong>CloudPilot Integration Suggestion:</strong> Since we detected <strong>{data.paymentGateway}</strong>, we will auto-configure secure webhook routing endpoints and API secret vaults inside your target AWS SSM Parameters environment during deployment.
        </div>
      </div>
    </div>
  );
}

export default TabCoreFeatures;
