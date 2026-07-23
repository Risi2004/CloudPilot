import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider, githubProvider, isConfigured } from '../../config/firebase';
import { signInWithPopup } from 'firebase/auth';
import { persistAuthSession } from '../../services/mfa';

// SVG Assets
import googleIcon from '../../assets/google.svg';
import githubIcon from '../../assets/github.svg';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function OAuthSection({ onMfaRequired }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleOAuth = async (provider) => {
    if (isLoading) return;

    if (!isConfigured) {
      alert(
        'Firebase Authentication is not configured. Please set the VITE_FIREBASE_* environment variables in your frontend .env file.'
      );
      return;
    }

    try {
      setIsLoading(true);
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const idToken = await user.getIdToken();

      const res = await fetch(`${API_URL}/api/auth/firebase-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Unified OAuth authentication failed.');
      }

      if (data.mfaRequired && data.mfaToken) {
        if (onMfaRequired) {
          onMfaRequired(data.mfaToken);
        } else {
          alert('Multi-factor authentication is required. Please sign in from the login page.');
        }
        return;
      }

      persistAuthSession(data);

      if (data.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="oauth-buttons-row">
        <button
          className="oauth-btn"
          type="button"
          disabled={isLoading}
          onClick={() => handleOAuth(googleProvider)}
        >
          <img src={googleIcon} alt="Google" className="oauth-icon" />
          {isLoading ? 'Connecting...' : 'Google'}
        </button>
        <button
          className="oauth-btn"
          type="button"
          disabled={isLoading}
          onClick={() => handleOAuth(githubProvider)}
        >
          <img src={githubIcon} alt="GitHub" className="oauth-icon" />
          {isLoading ? 'Connecting...' : 'GitHub'}
        </button>
      </div>

      <div className="protocol-divider">
        <div className="divider-line"></div>
        <span className="divider-text">SECURE PROTOCOL</span>
        <div className="divider-line"></div>
      </div>
    </>
  );
}

export default OAuthSection;
