import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

// Subcomponents
import AuthLayout from '../../components/Auth/AuthLayout';
import OAuthSection from '../../components/Auth/OAuthSection';
import AuthInput from '../../components/Auth/AuthInput';

// SVG Assets
import emailIcon from '../../assets/email.svg';
import passwordIcon from '../../assets/password.svg';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // MFA (authenticator app) challenge state
  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [mfaError, setMfaError] = useState('');
  const [mfaVerifying, setMfaVerifying] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${API_URL}/api/auth/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (res.ok) {
          return res.json();
        } else {
          throw new Error('Token verification failed');
        }
      })
      .then(data => {
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

        if (data.user.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/dashboard');
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('email');
        localStorage.removeItem('fullName');
        localStorage.removeItem('profileImageKey');
        localStorage.removeItem('profileImage');
        localStorage.removeItem('role');
      });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Regex check on email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      const normalizedEmail = email.toLowerCase().trim();
      const deviceToken = localStorage.getItem(`mfaDeviceToken:${normalizedEmail}`) || null;

      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, deviceToken })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed.');
      }

      if (data.mfaRequired) {
        setMfaToken(data.mfaToken);
        setMfaCode('');
        setMfaError('');
        setMfaModalOpen(true);
        return;
      }

      completeLogin(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const completeLogin = (data) => {
    // Store token and user details
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
    // Clear any temporary base64 image on new login to avoid stale local images
    localStorage.removeItem('profileImage');

    if (data.user.role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  const handleMfaVerify = async (e) => {
    e.preventDefault();
    if (!mfaCode) return;

    try {
      setMfaVerifying(true);
      setMfaError('');

      const res = await fetch(`${API_URL}/api/auth/mfa/verify-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfaToken, code: mfaCode, rememberDevice })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Verification failed.');
      }

      if (data.deviceToken) {
        const normalizedEmail = email.toLowerCase().trim();
        localStorage.setItem(`mfaDeviceToken:${normalizedEmail}`, data.deviceToken);
      }

      setMfaModalOpen(false);
      completeLogin(data);
    } catch (err) {
      setMfaError(err.message);
    } finally {
      setMfaVerifying(false);
    }
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

          <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="button-spinner"></span>
                INITIATING SESSION...
              </>
            ) : (
              <>
                INITIATE LOGIN <span className="submit-btn-arrow">→</span>
              </>
            )}
          </button>
        </form>

        <div className="auth-card-footer">
          <div className="footer-actions">
            <span className="footer-regular-text">New operator?</span>{' '}
            <button className="footer-link-btn" onClick={() => navigate('/signup')}>
              Register Fleet Access
            </button>
          </div>
          <div className="back-home-container">
            <button className="back-home-btn" onClick={() => navigate('/')}>
              ← Back to Home
            </button>
          </div>
        </div>
      </div>

      {/* MFA Authenticator Code Challenge Modal */}
      {mfaModalOpen && (
        <div className="otp-modal-overlay">
          <div className="otp-modal-card">
            <h3 className="otp-modal-title">AUTHENTICATOR CODE</h3>
            <p className="otp-modal-subtitle">
              Enter the 6-digit code from your authenticator app to complete login.
            </p>

            <form onSubmit={handleMfaVerify} className="otp-form">
              <input
                type="text"
                placeholder="000000"
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                className="otp-input-element"
                required
                autoFocus
              />

              <div className="mfa-remember-device-row">
                <input
                  type="checkbox"
                  id="remember-device"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                />
                <label htmlFor="remember-device">
                  Remember this device for 7 days (skip authenticator code)
                </label>
              </div>

              {mfaError && <p className="otp-error-message">{mfaError}</p>}

              <button type="submit" className="otp-submit-btn" disabled={mfaVerifying}>
                {mfaVerifying ? 'VERIFYING CODE...' : 'VERIFY & LOGIN'}
              </button>

              <div className="otp-actions-row">
                <button
                  type="button"
                  className="otp-cancel-btn"
                  onClick={() => setMfaModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}

export default Login;
