import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

// Subcomponents
import AuthLayout from '../../components/Auth/AuthLayout';
import OAuthSection from '../../components/Auth/OAuthSection';
import AuthInput from '../../components/Auth/AuthInput';
import MfaChallengeModal from '../../components/Auth/MfaChallengeModal';
import { persistAuthSession } from '../../services/mfa';

// SVG Assets
import emailIcon from '../../assets/email.svg';
import passwordIcon from '../../assets/password.svg';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mfaToken, setMfaToken] = useState(null);

  const navigateAfterAuth = (user) => {
    if (user?.role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${API_URL}/api/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
        .then((res) => {
          if (res.ok) {
            return res.json();
          }
          throw new Error('Token verification failed');
        })
        .then((data) => {
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

          navigateAfterAuth(data.user);
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

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed.');
      }

      if (data.mfaRequired && data.mfaToken) {
        setMfaToken(data.mfaToken);
        return;
      }

      persistAuthSession(data);
      navigateAfterAuth(data.user);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
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

        <OAuthSection
          onMfaRequired={(token) => setMfaToken(token)}
        />

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

      {mfaToken && (
        <MfaChallengeModal
          mfaToken={mfaToken}
          onCancel={() => setMfaToken(null)}
          onSuccess={(data) => {
            persistAuthSession(data);
            setMfaToken(null);
            navigateAfterAuth(data.user);
          }}
        />
      )}
    </AuthLayout>
  );
}

export default Login;
