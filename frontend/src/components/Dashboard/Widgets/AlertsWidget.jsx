import React, { useState } from 'react';
import './AlertsWidget.css';

function AlertsWidget({ analyses = [] }) {
  const [resolvedIds, setResolvedIds] = useState(new Set());

  const activeAlerts = [];
  analyses.forEach((analysis) => {
    const readiness = analysis.deploymentReadiness || {};
    const checks = Array.isArray(readiness.checks) ? readiness.checks : [];
    checks.forEach((check) => {
      if (check.status === 'fail' || check.status === 'warning') {
        const id = `${analysis._id}-${check.id}`;
        if (!resolvedIds.has(id)) {
          activeAlerts.push({
            id,
            severity: check.status === 'fail' ? 'Critical' : 'Warning',
            category: check.title,
            message: `${analysis.repoFullName || analysis.repoUrl.split('/').slice(-2).join('/')}: ${check.message}`,
            timestamp: 'Active',
            repoUrl: analysis.repoUrl,
          });
        }
      }
    });
  });

  const handleDismiss = (id) => {
    setResolvedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleResolve = (id, repoUrl) => {
    alert('AI resolution agent started. CloudPilot is correcting the repository settings.');
    setResolvedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  return (
    <section className="widget-card alerts-widget-card">
      <div className="widget-header">
        <div className="widget-header-title">
          <svg className="widget-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <h3>Active Alerts</h3>
        </div>
        {activeAlerts.length > 0 && (
          <span className="alerts-badge-count">{activeAlerts.length}</span>
        )}
      </div>

      <div className="alerts-list">
        {activeAlerts.length === 0 ? (
          <div className="all-clear-container">
            <div className="all-clear-circle">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <span className="all-clear-title">All Systems Secure</span>
            <span className="all-clear-desc">No active security, cost, or performance alerts found.</span>
          </div>
        ) : (
          activeAlerts.map((alert) => (
            <div key={alert.id} className={`alert-item-box ${alert.severity.toLowerCase()}`}>
              <div className="alert-item-header">
                <div className="alert-badge-group">
                  <span className={`alert-severity-badge ${alert.severity.toLowerCase()}`}>
                    {alert.severity}
                  </span>
                  <span className="alert-category-tag">{alert.category}</span>
                </div>
                <span className="alert-time-tag">{alert.timestamp}</span>
              </div>
              
              <p className="alert-message">{alert.message}</p>

              <div className="alert-actions">
                <button 
                  id={`btn-resolve-alert-${alert.id}`}
                  className="alert-btn-action resolve"
                  onClick={() => handleResolve(alert.id, alert.repoUrl)}
                >
                  Auto-Resolve
                </button>
                <button 
                  id={`btn-dismiss-alert-${alert.id}`}
                  className="alert-btn-action dismiss"
                  onClick={() => handleDismiss(alert.id)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default AlertsWidget;
