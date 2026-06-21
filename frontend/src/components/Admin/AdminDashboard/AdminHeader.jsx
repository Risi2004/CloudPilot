import React from 'react';
import './AdminHeader.css';

function AdminHeader() {
  return (
    <header className="admin-header">
      <div className="admin-header-left">
        <h1 className="admin-header-title">Platform Overview</h1>
        <p className="admin-header-subtitle">Real-time infrastructure and system intelligence dashboard.</p>
      </div>
      
      <div className="admin-header-right">
        <div className="system-status-banner">
          <div className="status-indicator-icon-wrapper">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4edea3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="status-check-icon">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div className="system-status-info">
            <span className="status-label">System Status:</span>
            <span className="status-value">All Services Operational</span>
          </div>
          <div className="uptime-pill">99.9% Uptime</div>
        </div>
      </div>
    </header>
  );
}

export default AdminHeader;
