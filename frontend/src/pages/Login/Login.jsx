import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

// Subcomponents
import AuthLayout from '../../components/Auth/AuthLayout';
import OAuthSection from '../../components/Auth/OAuthSection';
import AuthInput from '../../components/Auth/AuthInput';

// SVG Assets
import emailIcon from '../../assets/email.svg';
import passwordIcon from '../../assets/password.svg';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Initiating login with:', { email, password });
    navigate('/dashboard');
  };

  const emergencyResetLink = (
    <a href="#reset" className="emergency-reset-link" onClick={(e) => e.preventDefault()}>
      Emergency Reset?
    </a>
  );

  return (
    <AuthLayout>
      <div className="auth-card">
        <h2 className="auth-card-title">Initialize Session</h2>
        <p className="auth-card-subtitle">Authorize access to the CloudPilot Mission Control.</p>

        {/* OAuth Buttons & Divider */}
        <OAuthSection />

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <AuthInput
            label="ACCESS IDENTIFIER"
            type="email"
            placeholder="commander@fleet.io"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            prefixIcon={emailIcon}
          />

          <AuthInput
            label="ENCRYPTION KEY"
            type="password"
            placeholder="••••••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            prefixIcon={passwordIcon}
            rightLabelAction={emergencyResetLink}
          />

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
    </AuthLayout>
  );
}

export default Login;
