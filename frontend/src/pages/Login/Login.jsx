import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

// SVG Assets
import fleetManagementIcon from '../../assets/fleet-management.svg';
import controlPlaneIcon from '../../assets/control-plane.svg';
import googleIcon from '../../assets/google.svg';
import githubIcon from '../../assets/github.svg';
import emailIcon from '../../assets/email.svg';
import passwordIcon from '../../assets/password.svg';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Initiating login with:', { email, password });
  };

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

        {/* Right Column: Interactive Login Card */}
        <div className="auth-right-panel">
          <div className="auth-card">
            <h2 className="auth-card-title">Initialize Session</h2>
            <p className="auth-card-subtitle">Authorize access to the CloudPilot Mission Control.</p>

            {/* Social Oauth Buttons */}
            <div className="oauth-buttons-row">
              <button className="oauth-btn" type="button" onClick={() => console.log('Oauth Google')}>
                <img src={googleIcon} alt="Google" className="oauth-icon" />
                Google
              </button>
              <button className="oauth-btn" type="button" onClick={() => console.log('Oauth GitHub')}>
                <img src={githubIcon} alt="GitHub" className="oauth-icon" />
                GitHub
              </button>
            </div>

            {/* Secure Protocol Divider */}
            <div className="protocol-divider">
              <div className="divider-line"></div>
              <span className="divider-text">SECURE PROTOCOL</span>
              <div className="divider-line"></div>
            </div>

            {/* Credentials Form */}
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="input-group">
                <label className="input-label">ACCESS IDENTIFIER</label>
                <div className="input-field-container">
                  <span className="input-prefix-icon-wrapper">
                    <img src={emailIcon} alt="Email" className="input-prefix-icon" />
                  </span>
                  <input
                    type="email"
                    className="auth-input-element"
                    placeholder="commander@fleet.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <div className="input-label-row">
                  <label className="input-label">ENCRYPTION KEY</label>
                  <a href="#reset" className="emergency-reset-link" onClick={(e) => e.preventDefault()}>
                    Emergency Reset?
                  </a>
                </div>
                <div className="input-field-container">
                  <span className="input-prefix-icon-wrapper">
                    <img src={passwordIcon} alt="Password" className="input-prefix-icon" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input-element"
                    placeholder="••••••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="toggle-password-visibility-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle Password Visibility"
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" className="auth-submit-btn">
                INITIATE LOGIN <span className="submit-btn-arrow">→</span>
              </button>
            </form>

            <div className="auth-card-footer">
              <span className="footer-regular-text">New operator?</span>{' '}
              <button className="footer-link-btn" onClick={() => navigate('/signup')}>
                Register Fleet Access
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Login;
