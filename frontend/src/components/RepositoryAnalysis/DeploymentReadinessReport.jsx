import React from 'react';
import './DeploymentReadinessReport.css';

const STATUS_ORDER = { fail: 0, warning: 1, pass: 2 };

const STATUS_META = {
  fail: { label: 'Failed', className: 'dr-status-fail' },
  warning: { label: 'Warning', className: 'dr-status-warning' },
  pass: { label: 'Passed', className: 'dr-status-pass' },
};

const OVERALL_META = {
  'Ready': { className: 'dr-overall-ready' },
  'Needs Attention': { className: 'dr-overall-warning' },
  'Not Ready': { className: 'dr-overall-fail' },
};

function StatusIcon({ status }) {
  if (status === 'pass') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    );
  }
  if (status === 'warning') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 9v4"></path>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <path d="M12 17h.01"></path>
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="15" y1="9" x2="9" y2="15"></line>
      <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>
  );
}

function DeploymentReadinessReport({ data, onContinue }) {
  const checks = Array.isArray(data && data.checks) ? data.checks : [];
  const score = typeof (data && data.score) === 'number' ? data.score : null;
  const overallStatus = (data && data.overallStatus) || 'Ready';
  const summary = data && data.summary;
  const topRecommendations = Array.isArray(data && data.topRecommendations) ? data.topRecommendations : [];

  const sortedChecks = [...checks].sort((a, b) => {
    const orderA = STATUS_ORDER[a.status] ?? 3;
    const orderB = STATUS_ORDER[b.status] ?? 3;
    return orderA - orderB;
  });

  const overallMeta = OVERALL_META[overallStatus] || OVERALL_META['Ready'];

  return (
    <div className="dr-report-container">
      <div className="dr-report-card">
        <div className="dr-status-banner">
          <span className="dr-pulse-dot"></span>
          <span>DEPLOYMENT READINESS CHECK</span>
        </div>

        <h2 className="dr-report-title">Deployment Readiness Report</h2>
        <p className="dr-report-desc">
          We scanned this repository for common deploy blockers - missing configuration, hardcoded secrets, and unsupported runtimes - before you head to the dashboard.
        </p>

        <div className="dr-overview-row">
          {score !== null && (
            <div className="dr-score-badge">
              <span className="dr-score-value">{score}</span>
              <span className="dr-score-max">/100</span>
            </div>
          )}
          <div className={`dr-overall-pill ${overallMeta.className}`}>{overallStatus}</div>
        </div>

        {summary && <p className="dr-summary-text">{summary}</p>}

        {topRecommendations.length > 0 && (
          <div className="dr-recommendations-box">
            <div className="dr-recommendations-title">Top Recommendations</div>
            <ul className="dr-recommendations-list">
              {topRecommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="dr-checklist">
          {sortedChecks.map((check) => {
            const meta = STATUS_META[check.status] || STATUS_META.pass;
            return (
              <div key={check.id} className={`dr-check-row ${meta.className}`}>
                <div className="dr-check-icon">
                  <StatusIcon status={check.status} />
                </div>
                <div className="dr-check-body">
                  <div className="dr-check-header">
                    <span className="dr-check-title">{check.title}</span>
                    <span className={`dr-check-badge ${meta.className}`}>{meta.label}</span>
                  </div>
                  <p className="dr-check-message">{check.message}</p>
                </div>
              </div>
            );
          })}
        </div>

        <button type="button" className="dr-continue-btn" onClick={onContinue}>
          Continue to Dashboard →
        </button>
      </div>
    </div>
  );
}

export default DeploymentReadinessReport;
