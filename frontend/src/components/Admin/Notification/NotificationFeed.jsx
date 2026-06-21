import React from 'react';
import './NotificationFeed.css';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'failures', label: 'Failures' },
  { id: 'security', label: 'Security' },
  { id: 'agents', label: 'Agents' },
];

function NotificationFeed({
  notifications,
  activeId,
  activeFilter,
  onSelect,
  onFilterChange,
  onMarkAllRead,
}) {
  return (
    <div className="notification-feed-panel">
      <div className="notification-feed-header">
        <h2 className="notification-feed-title">Notification Feed</h2>
        <button type="button" className="mark-all-read-btn" onClick={onMarkAllRead}>
          Mark all as read
        </button>
      </div>

      <div className="notification-filter-chips">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={`notification-filter-chip ${activeFilter === filter.id ? 'active' : ''}`}
            onClick={() => onFilterChange(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="notification-cards-list">
        {notifications.length === 0 ? (
          <div className="notification-empty-state">No notifications in this category.</div>
        ) : (
          notifications.map((notif) => (
            <button
              key={notif.id}
              type="button"
              className={`notification-card ${activeId === notif.id ? 'active' : ''} ${!notif.read ? 'unread' : ''}`}
              onClick={() => onSelect(notif.id)}
            >
              <div className="notification-card-top">
                <span className={`notification-tag tag-${notif.tagColor}`}>{notif.tag}</span>
                <span className="notification-time">{notif.timeAgo}</span>
              </div>
              <h3 className="notification-card-title">{notif.title}</h3>
              <p className="notification-card-snippet">{notif.snippet}</p>
              {activeId === notif.id && (
                <span className="notification-card-footer">Click to view details</span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default NotificationFeed;
