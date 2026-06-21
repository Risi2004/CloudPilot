import React from 'react';
import './RecentEvents.css';

const EVENTS = [
  {
    id: 'evt-1',
    source: {
      type: 'user',
      avatarText: 'UX',
      name: 'User: Xander King',
      meta: 'Pro Plan • ID: 89012'
    },
    action: {
      text: 'v2SkyNet-project',
      isCode: true
    },
    status: {
      text: 'SUCCESS',
      type: 'success'
    },
    timestamp: '2m ago',
    impact: {
      text: 'Production Update',
      type: 'normal'
    }
  },
  {
    id: 'evt-2',
    source: {
      type: 'agent',
      avatarText: '🤖',
      name: 'AI Agent: CostOptimizer',
      meta: 'Autonomous Unit 04'
    },
    action: {
      text: 'Optimized EC2 Instances in AWS',
      isCode: false
    },
    status: {
      text: 'COMPLETED',
      type: 'completed'
    },
    timestamp: '12m ago',
    impact: {
      text: '-$450.00/mo',
      type: 'positive' // cost savings
    }
  },
  {
    id: 'evt-3',
    source: {
      type: 'user',
      avatarText: 'SM',
      name: 'User: Sarah Miller',
      meta: 'Free Tier • ID: 44102'
    },
    action: {
      text: 'New Account Registered',
      isCode: false
    },
    status: {
      text: 'VERIFIED',
      type: 'verified'
    },
    timestamp: '45m ago',
    impact: {
      text: 'Acquisition',
      type: 'normal'
    }
  },
  {
    id: 'evt-4',
    source: {
      type: 'system',
      avatarText: '⚠️',
      name: 'System: HealthCheck',
      meta: 'Automated Monitor'
    },
    action: {
      text: 'Latency Spike Detected in Azure',
      isCode: false
    },
    status: {
      text: 'ALERTING',
      type: 'alerting'
    },
    timestamp: '1h 12m ago',
    impact: {
      text: 'Critical Reliability',
      type: 'negative'
    }
  }
];

function RecentEvents({ onViewAllLogs }) {
  return (
    <div className="recent-events-card">
      <div className="recent-events-header">
        <h3 className="events-title">Recent Global Events</h3>
        <button className="view-all-logs-btn" onClick={onViewAllLogs}>
          View All Logs
        </button>
      </div>

      <div className="events-table-wrapper">
        <table className="events-table">
          <thead>
            <tr>
              <th>EVENT SOURCE</th>
              <th>ACTION</th>
              <th>STATUS</th>
              <th>TIMESTAMP</th>
              <th>IMPACT</th>
            </tr>
          </thead>
          <tbody>
            {EVENTS.map((evt) => (
              <tr key={evt.id} className="event-row">
                
                {/* Event Source */}
                <td className="col-source">
                  <div className="source-cell">
                    <div className={`source-avatar ${evt.source.type}`}>
                      {evt.source.avatarText}
                    </div>
                    <div className="source-info">
                      <span className="source-name">{evt.source.name}</span>
                      <span className="source-meta">{evt.source.meta}</span>
                    </div>
                  </div>
                </td>

                {/* Action */}
                <td className="col-action">
                  {evt.action.isCode ? (
                    <span className="code-badge">{evt.action.text}</span>
                  ) : (
                    <span className="action-text">{evt.action.text}</span>
                  )}
                </td>

                {/* Status */}
                <td className="col-status">
                  <span className={`status-pill ${evt.status.type}`}>
                    <span className="pill-dot" />
                    {evt.status.text}
                  </span>
                </td>

                {/* Timestamp */}
                <td className="col-timestamp">
                  <span className="timestamp-text">{evt.timestamp}</span>
                </td>

                {/* Impact */}
                <td className="col-impact">
                  <span className={`impact-text ${evt.impact.type}`}>
                    {evt.impact.text}
                  </span>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RecentEvents;
