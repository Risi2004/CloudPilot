import React from 'react';
import './SecuritySettings.css';

// SVG Icon from Assets
import securityIcon from '../../../assets/security.svg';

function SecuritySettings({
  enforce2fa,
  sessionTimeout,
  onInputChange,
  onToggleChange
}) {
  return (
    <div className="settings-card security-card">
      <div className="card-header-row">
        <div className="header-title-block">
          <img src={securityIcon} alt="Security Settings" className="header-icon" />
          <h3 className="card-title">Security & Access</h3>
        </div>
      </div>

      <div className="card-body">
        {/* Grid of 3 controls */}
        <div className="security-controls-grid">
          {/* Card 1: Enforce 2FA */}
          <div className="security-control-box">
            <div className="control-box-left">
              <span className="control-box-title">Enforce 2FA</span>
              <span className="control-box-desc">All administrative users</span>
            </div>
            
            <label className="switch-toggle">
              <input
                type="checkbox"
                checked={enforce2fa}
                onChange={() => onToggleChange('enforce2fa')}
              />
              <span className="switch-slider" />
            </label>
          </div>

          {/* Card 2: Session Timeout */}
          <div className="security-control-box">
            <div className="control-box-left">
              <span className="control-box-title">Session Timeout</span>
              <div className="timeout-input-wrapper">
                <input
                  type="number"
                  className="timeout-input"
                  value={sessionTimeout}
                  onChange={(e) => onInputChange('sessionTimeout', parseInt(e.target.value) || 0)}
                  min="5"
                  max="1440"
                />
                <span className="timeout-unit">minutes</span>
              </div>
            </div>
          </div>

          {/* Card 3: ACL */}
          <div className="security-control-box">
            <div className="control-box-left">
              <span className="control-box-title">Access Control List (ACL)</span>
              <div className="acl-badges-row">
                <span className="acl-badge role-superadmin">Superadmin</span>
                <span className="acl-badge role-sre">SRE</span>
                <span className="acl-badge role-more" title="Developer, Reader, Operator, Deployer">+ 4 more</span>
              </div>
            </div>
          </div>
        </div>

        {/* Warning Notification Bar */}
        <div className="ip-whitelist-banner">
          <div className="banner-left">
            {/* Alerts warning icon */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="banner-alert-icon">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span className="banner-text">
              System-wide IP Whitelisting is currently <strong className="disabled-highlight">DISABLED</strong>. We recommend enabling it for production clusters.
            </span>
          </div>

          <button
            className="banner-action-link"
            onClick={() => {
              const ip = prompt('Enter IP Address / Range to whitelist (e.g. 192.168.1.0/24):');
              if (ip) alert(`IP range ${ip} has been added to staging whitelists.`);
            }}
          >
            Manage IP Whitelist
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="link-arrow-icon">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default SecuritySettings;
