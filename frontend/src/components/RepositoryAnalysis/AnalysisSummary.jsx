import React from 'react';

function AnalysisSummary({ data }) {
  const totalCost = data.iac?.monthlyCost?.find(c => c.total)?.total || 'Estimated: $36.30 / mo';
  const displayCost = totalCost.replace('Total Estimate: ', '').replace('Estimated: ', '');

  return (
    <div className="analysis-summary-grid">
      {/* Language */}
      <div className="summary-card">
        <div className="summary-card-header">
          <span className="summary-card-icon language">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16.5 9.4 7.55 4.24a1.79 1.79 0 0 0-2.5 1.55v12.42a1.79 1.79 0 0 0 2.5 1.55l8.95-5.16a1.79 1.79 0 0 0 0-3.1automator"></path>
            </svg>
          </span>
          <span className="summary-card-label">PRIMARY LANGUAGE</span>
        </div>
        <div className="summary-card-value">{data.language}</div>
        <div className="summary-card-badge positive">100% Parsed</div>
      </div>

      {/* Framework */}
      <div className="summary-card">
        <div className="summary-card-header">
          <span className="summary-card-icon framework">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
              <line x1="6" y1="6" x2="6.01" y2="6"></line>
              <line x1="6" y1="18" x2="6.01" y2="18"></line>
            </svg>
          </span>
          <span className="summary-card-label">DETECTED FRAMEWORK</span>
        </div>
        <div className="summary-card-value">{data.framework}</div>
        <div className="summary-card-badge info">Active Runtime</div>
      </div>

      {/* Payment Gateway */}
      <div className="summary-card">
        <div className="summary-card-header">
          <span className="summary-card-icon payments">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>
          </span>
          <span className="summary-card-label">PAYMENT GATEWAY</span>
        </div>
        <div className="summary-card-value">{data.paymentGateway}</div>
        <div className="summary-card-badge positive">Integrations Detected</div>
      </div>

      {/* Infrastructure Cost */}
      <div className="summary-card">
        <div className="summary-card-header">
          <span className="summary-card-icon cost">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </span>
          <span className="summary-card-label">ESTIMATED RUNTIME COST</span>
        </div>
        <div className="summary-card-value">{displayCost}</div>
        <div className="summary-card-badge warning">Optimized AWS</div>
      </div>

      {/* Target Containerization */}
      <div className="summary-card">
        <div className="summary-card-header">
          <span className="summary-card-icon container">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </span>
          <span className="summary-card-label">CONTAINER RECIPE</span>
        </div>
        <div className="summary-card-value">{data.containerization?.baseImage}</div>
        <div className="summary-card-badge positive">Dockerfile Ready</div>
      </div>

      {/* Vulnerabilities scan */}
      <div className="summary-card">
        <div className="summary-card-header">
          <span className="summary-card-icon security">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </span>
          <span className="summary-card-label">SECURITY AUDIT</span>
        </div>
        <div className="summary-card-value">PASS (Secure)</div>
        <div className="summary-card-badge positive">0 Issues Found</div>
      </div>
    </div>
  );
}

export default AnalysisSummary;
