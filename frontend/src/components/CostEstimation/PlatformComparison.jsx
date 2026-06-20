import React from 'react';
import './PlatformComparison.css';

function PlatformComparison({ comparisons }) {
  return (
    <div className="platform-comparison-card">
      <div className="comparison-header">
        <h3 className="comparison-title">Provider Comparison Matrix</h3>
        <p className="comparison-subtitle">AWS Fargate vs Railway PaaS vs Render PaaS</p>
      </div>

      <div className="comparison-grid">
        {comparisons.map((provider, idx) => (
          <div key={idx} className={`comparison-col-card ${provider.isRecommended ? 'recommended' : ''}`}>
            {provider.isRecommended && (
              <div className="recommended-badge font-mono">RECOMMENDED OPTION</div>
            )}
            
            <div className="provider-info-row">
              <h4 className="provider-name">{provider.name}</h4>
              <div className="provider-cost-wrap">
                <span className="provider-cost font-mono">{provider.cost}</span>
                <span className="provider-period">/ month</span>
              </div>
            </div>

            <p className="provider-desc">{provider.description}</p>

            <div className="provider-metrics-list">
              <div className="provider-metric">
                <span className="metric-label">Deployment Model</span>
                <span className="metric-val">{provider.deploymentModel}</span>
              </div>
              <div className="provider-metric">
                <span className="metric-label">Setup Overhead</span>
                <span className="metric-val">{provider.setupOverhead}</span>
              </div>
              <div className="provider-metric">
                <span className="metric-label">Scalability Limit</span>
                <span className="metric-val">{provider.scalability}</span>
              </div>
            </div>

            <div className="provider-pros-section">
              <h5 className="section-title">KEY ADVANTAGE</h5>
              <div className="pro-advantage-bullet">
                <span className="advantage-bullet-icon">✓</span>
                <span className="advantage-text">{provider.advantage}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PlatformComparison;
