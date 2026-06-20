import React, { useState } from 'react';
import './AlertsWidget.css';

const INITIAL_ALERTS = [
  {
    id: 'alert-1',
    severity: 'Critical',
    category: 'Security',
    message: "S3 bucket 'cloudpilot-billing-docs' is publicly readable",
    timestamp: '10 mins ago',
  },
  {
    id: 'alert-2',
    severity: 'Warning',
    category: 'Performance',
    message: 'Database CPU exceeded 90% threshold for 15 minutes',
    timestamp: '1 hour ago',
  },
  {
    id: 'alert-3',
    severity: 'Info',
    category: 'Cost',
    message: 'New optimization: Downsize idle db.t3.medium instance to micro',
    timestamp: '4 hours ago',
  },
];

function AlertsWidget() {
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);

  const handleDismiss = (id) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  const handleResolve = (id) => {
    console.log(`Resolving alert: ${id}`);
    alert('AI resolving script initiated. This alert will clear shortly!');
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
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
        {alerts.length > 0 && (
          <span className="alerts-badge-count">{alerts.length}</span>
        )}
      </div>

      <div className="alerts-list">
        {alerts.length === 0 ? (
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
          alerts.map((alert) => (
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
                  onClick={() => handleResolve(alert.id)}
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
