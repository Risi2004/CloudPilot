import React from 'react';
import './NotificationDetail.css';
import shareIcon from '../../../assets/Share.svg';
import archiveIcon from '../../../assets/Archive.svg';
import aiInsightsIcon from '../../../assets/ai-insights.svg';

function ActionIcon({ type }) {
  if (type === 'logs') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    );
  }
  if (type === 'restart') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function NotificationDetail({ notification, onMarkResolved, onQuickFix }) {
  const severityClass = notification.severity.toLowerCase();

  return (
    <div className="notification-detail-panel">
      <div className="notification-detail-header">
        <div className="notification-detail-header-left">
          <div className="notification-detail-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <h2 className="notification-detail-title">{notification.title}</h2>
            <p className="notification-detail-meta">
              Event ID: {notification.eventId} &middot; Region: {notification.region}
            </p>
          </div>
        </div>

        <div className="notification-detail-header-actions">
          <button type="button" className="detail-icon-btn" title="Share" onClick={() => alert('Share link copied.')}>
            <img src={shareIcon} alt="Share" />
          </button>
          <button type="button" className="detail-icon-btn" title="Archive" onClick={() => alert('Notification archived.')}>
            <img src={archiveIcon} alt="Archive" />
          </button>
        </div>
      </div>

      <div className="notification-metadata-grid">
        <div className="metadata-box">
          <span className="metadata-label">Time Stamp</span>
          <span className="metadata-value">{notification.timestamp}</span>
        </div>
        <div className="metadata-box">
          <span className="metadata-label">Severity</span>
          <span className={`metadata-value severity-${severityClass}`}>
            {notification.severity === 'Critical' && '! '}
            {notification.severity}
          </span>
        </div>
        <div className="metadata-box">
          <span className="metadata-label">Component</span>
          <span className="metadata-value">{notification.component}</span>
        </div>
      </div>

      <div className="notification-section">
        <h3 className="notification-section-title">Event Summary</h3>
        <p className="notification-section-text">{notification.summary}</p>
      </div>

      <div className="ai-recommendation-box">
        <div className="ai-recommendation-header">
          <img src={aiInsightsIcon} alt="" className="ai-recommendation-icon" />
          <span className="ai-recommendation-label">AI Recommendation</span>
        </div>
        <p className="ai-recommendation-text">{notification.aiRecommendation}</p>
      </div>

      <div className="notification-section">
        <h3 className="notification-section-title">System Context</h3>
        <div className="system-context-bars">
          <div className="context-bar-row">
            <div className="context-bar-header">
              <span className="context-bar-label">CPU Utilization</span>
              <span className="context-bar-value">{notification.systemContext.cpu}%</span>
            </div>
            <div className="context-bar-track">
              <div
                className="context-bar-fill cpu"
                style={{ width: `${notification.systemContext.cpu}%` }}
              />
            </div>
          </div>
          <div className="context-bar-row">
            <div className="context-bar-header">
              <span className="context-bar-label">Memory Usage</span>
              <span className="context-bar-value">{notification.systemContext.memory}%</span>
            </div>
            <div className="context-bar-track">
              <div
                className="context-bar-fill memory"
                style={{ width: `${notification.systemContext.memory}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="notification-section">
        <h3 className="notification-section-title">Recommended Actions</h3>
        <div className="recommended-actions-list">
          {notification.actions.map((action) => (
            <button
              key={action.id}
              type="button"
              className="recommended-action-row"
              onClick={() => alert(`Action: ${action.label}`)}
            >
              <span className="action-icon-wrap">
                <ActionIcon type={action.icon} />
              </span>
              <span className="action-label">{action.label}</span>
              <svg className="action-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div className="notification-detail-footer">
        <button type="button" className="mark-resolved-btn" onClick={onMarkResolved}>
          Mark as Resolved
        </button>
        <button type="button" className="quick-fix-btn" onClick={onQuickFix}>
          Quick Fix Agent
        </button>
      </div>
    </div>
  );
}

export default NotificationDetail;
