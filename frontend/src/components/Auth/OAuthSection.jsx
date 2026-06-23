import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider, githubProvider, isConfigured } from '../../config/firebase';
import { signInWithPopup } from 'firebase/auth';

// SVG Assets
import googleIcon from '../../assets/google.svg';
import githubIcon from '../../assets/github.svg';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function OAuthSection() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleOAuth = async (provider) => {
    if (isLoading) return;

    if (!isConfigured) {
      alert("Firebase Authentication is not configured. Please set the VITE_FIREBASE_* environment variables in your frontend .env file.");
      return;
    }

    try {
      setIsLoading(true);
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Get the ID token from Firebase
      const idToken = await user.getIdToken();

      // Exchange Firebase ID Token for a backend JWT session
      const res = await fetch(`${API_URL}/api/auth/firebase-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Unified OAuth authentication failed.');
      }

      // Save token and user details to localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('email', data.user.email);
      if (data.user.fullName) {
        localStorage.setItem('fullName', data.user.fullName);
      } else {
        localStorage.removeItem('fullName');
      }
      if (data.user.profileImageKey) {
        localStorage.setItem('profileImageKey', data.user.profileImageKey);
      } else {
        localStorage.removeItem('profileImageKey');
      }
      if (data.user.role) {
        localStorage.setItem('role', data.user.role);
      } else {
        localStorage.removeItem('role');
      }
      if (data.user.plan) {
        localStorage.setItem('plan', data.user.plan);
      } else {
        localStorage.removeItem('plan');
      }
      localStorage.removeItem('profileImage');

      // Navigate to destination depending on user role
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
      {/* Social Oauth Buttons */}
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

      {/* Secure Protocol Divider */}
      <div className="protocol-divider">
        <div className="divider-line"></div>
        <span className="divider-text">SECURE PROTOCOL</span>
        <div className="divider-line"></div>
      </div>
    </>
  );
}

export default OAuthSection;
