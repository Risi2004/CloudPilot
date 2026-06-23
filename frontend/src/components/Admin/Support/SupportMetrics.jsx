import React from 'react';
import './SupportMetrics.css';

function SupportMetrics() {
  return (
    <div className="support-metrics-row">
      <div className="support-metric-card">
        <span className="metric-title-label">AVG. RESPONSE</span>
        <span className="metric-value-text">48 Hours</span>
      </div>
      <div className="support-metric-card">
        <span className="metric-title-label">SLA HEALTH</span>
        <span className="metric-value-text text-green">98.2%</span>
      </div>
    </div>
  );
}

export default SupportMetrics;
