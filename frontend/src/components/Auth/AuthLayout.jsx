import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../pages/Login/Login.css'; // Uses common auth styles

// SVG Assets
import fleetManagementIcon from '../../assets/fleet-management.svg';
import controlPlaneIcon from '../../assets/control-plane.svg';

function AuthLayout({ children }) {
  const navigate = useNavigate();

  return (
    <div className="auth-page-container">
      <div className="auth-split-wrapper">
        
        {/* Left Column: Product Branding & Features */}
        <div className="auth-left-panel">
          <div className="auth-brand-header" onClick={() => navigate('/')} title="Return to Home">
            <h1 className="auth-brand-logo">CLOUDPILOT</h1>
            <div className="system-status-pill">
              <span className="status-dot"></span>
              <span className="status-text">SYSTEM ONLINE: V4.2.0</span>
            </div>
          </div>

          <div className="auth-features-box">
            <div className="auth-feature-item">
              <div className="feature-icon-wrapper">
                <img src={fleetManagementIcon} alt="Fleet Management" className="feature-icon" />
              </div>
              <div className="feature-info">
                <h3 className="feature-title">Autonomous Fleet Management</h3>
                <p className="feature-desc">
                  Deploy across global regions with zero-touch configuration. Our AI orchestrates every node.
                </p>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="feature-icon-wrapper">
                <img src={controlPlaneIcon} alt="Control Plane" className="feature-icon" />
              </div>
              <div className="feature-info">
                <h3 className="feature-title">Unified Control Plane</h3>
                <p className="feature-desc">
                  A single source of truth for your multi-cloud infrastructure and telemetry streams.
                </p>
              </div>
            </div>
          </div>

          <div className="auth-social-proof">
            <div className="commander-avatars">
              <div className="avatar-circle av-1">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.33 4 18V20H20V18C20 15.33 14.67 14 12 14Z" fill="#00D4FF"/>
                </svg>
              </div>
              <div className="avatar-circle av-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.33 4 18V20H20V18C20 15.33 14.67 14 12 14Z" fill="#3B82F6"/>
                </svg>
              </div>
              <div className="avatar-circle av-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.33 4 18V20H20V18C20 15.33 14.67 14 12 14Z" fill="#10B981"/>
                </svg>
              </div>
            </div>
            <span className="social-proof-text">Trusted by 2,400+ Fleet Commanders</span>
          </div>
        </div>

        {/* Right Column: Custom Child Panel Form/Card */}
        <div className="auth-right-panel">
          {children}
        </div>

      </div>
    </div>
  );
}

export default AuthLayout;
