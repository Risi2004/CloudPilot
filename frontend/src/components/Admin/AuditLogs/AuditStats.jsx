import React from 'react';
import './AuditStats.css';

// SVG Icons from Assets
import securityIcon from '../../../assets/security.svg';
import latencyIcon from '../../../assets/system-latency.svg';
import costIcon from '../../../assets/cost-optimization.svg';

function AuditStats() {
  return (
    <div className="audit-stats-grid">
      {/* Security Integrity Card */}
      <div className="stat-insight-card purple-theme">
        <div className="stat-card-header">
          <div className="title-block">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2.5" className="sparkle-icon">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <h3 className="stat-card-title">Security Integrity</h3>
          </div>
          <img src={securityIcon} alt="Security" className="stat-card-icon" />
        </div>
        <p className="stat-card-desc">
          AI analysis detected a 14% increase in unusual login patterns from unknown IPs over the last 6 hours.
        </p>
        <div className="progress-bar-container">
          <div className="progress-bar-fill fill-purple" style={{ width: '25%' }} />
        </div>
        <div className="stat-card-footer">
          <span className="footer-label">Risk Level:</span>
          <span className="footer-value font-purple">Moderate</span>
        </div>
      </div>

      {/* System Latency Card */}
      <div className="stat-insight-card green-theme">
        <div className="stat-card-header">
          <div className="title-block">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" className="trend-icon">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
            <h3 className="stat-card-title">System Latency</h3>
          </div>
          <img src={latencyIcon} alt="Latency" className="stat-card-icon" />
        </div>
        <p className="stat-card-desc">
          Platform updates on Core v2.4.1 reduced mean log processing time by 42ms per event.
        </p>
        <div className="progress-bar-container">
          <div className="progress-bar-fill fill-green" style={{ width: '65%' }} />
        </div>
        <div className="stat-card-footer">
          <span className="footer-label">Performance Index:</span>
          <span className="footer-value font-green">Optimal</span>
        </div>
      </div>

      {/* Cost Optimization Card */}
      <div className="stat-insight-card blue-theme">
        <div className="stat-card-header">
          <div className="title-block">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5" className="wallet-icon">
              <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>
            <h3 className="stat-card-title">Cost Optimization</h3>
          </div>
          <img src={costIcon} alt="Cost" className="stat-card-icon" />
        </div>
        <p className="stat-card-desc">
          Scaling actions by Pilot-01 saved approximately $1,240 in compute costs since midnight.
        </p>
        <div className="progress-bar-container">
          <div className="progress-bar-fill fill-blue" style={{ width: '38%' }} />
        </div>
        <div className="stat-card-footer">
          <span className="footer-label">Projected Monthly Savings:</span>
          <span className="footer-value font-blue">$34k</span>
        </div>
      </div>
    </div>
  );
}

export default AuditStats;
