import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Signup.css';

// Subcomponents
import AuthLayout from '../../components/Auth/AuthLayout';
import OAuthSection from '../../components/Auth/OAuthSection';
import AuthInput from '../../components/Auth/AuthInput';

// SVG Assets
import emailIcon from '../../assets/email.svg';
import passwordIcon from '../../assets/password.svg';

function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    console.log('Registering user with:', { email, password });
    navigate('/dashboard');
  };

  return (
    <AuthLayout>
      <div className="auth-card">
        <h2 className="auth-card-title">Your Autonomous Cloud Engineer</h2>
        <p className="auth-card-subtitle">Deploy. Monitor. Scale.</p>

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
          />

          <AuthInput
            label="CONFIRM ENCRYPTION KEY"
            type="password"
            placeholder="••••••••••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            prefixIcon={passwordIcon}
          />

          <button type="submit" className="auth-submit-btn">
            REGISTER FLEET ACCESS <span className="submit-btn-arrow">→</span>
          </button>
        </form>

        <div className="auth-card-footer">
          <span className="footer-regular-text">Already have an account?</span>{' '}
          <button className="footer-link-btn" onClick={() => navigate('/login')}>
            login
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}

export default Signup;
