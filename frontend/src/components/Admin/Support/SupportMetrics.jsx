import React from 'react';
import './SupportMetrics.css';

function SupportMetrics({ tickets = [] }) {
  const newCount = tickets.filter(t => t.status === 'open').length;
  const activeCount = tickets.filter(t => t.status === 'in-progress').length;
  const closedCount = tickets.filter(t => t.status === 'closed' || t.status === 'resolved').length;

  return (
    <div className="support-metrics-row">
      <div className="support-metric-card">
        <span className="metric-title-label">NEW TICKETS</span>
        <span className="metric-value-text text-blue">{newCount}</span>
      </div>
      <div className="support-metric-card">
        <span className="metric-title-label">ACTIVE TICKETS</span>
        <span className="metric-value-text text-amber">{activeCount}</span>
      </div>
      <div className="support-metric-card">
        <span className="metric-title-label">CLOSED TICKETS</span>
        <span className="metric-value-text text-green">{closedCount}</span>
      </div>
    </div>
  );
}

export default SupportMetrics;
