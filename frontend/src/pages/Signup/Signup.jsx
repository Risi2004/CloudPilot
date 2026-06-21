import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Signup.css';

// Subcomponents
import AuthLayout from '../../components/Auth/AuthLayout';
import OAuthSection from '../../components/Auth/OAuthSection';
import AuthInput from '../../components/Auth/AuthInput';

// SVG Assets
import emailIcon from '../../assets/email.svg';
import passwordIcon from '../../assets/password.svg';
import profileIcon from '../../assets/profile.svg';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileImage, setProfileImage] = useState(null);

  // OTP Modal State
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0); // in seconds
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendStatus, setResendStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Countdown timer for OTP resend throttle (5 mins = 300s)
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${API_URL}/api/auth/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (res.ok) {
          navigate('/dashboard');
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('email');
          localStorage.removeItem('fullName');
          localStorage.removeItem('profileImageKey');
          localStorage.removeItem('profileImage');
        }
      })
      .catch(() => {});
    }
  }, [navigate]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 1. Size check: 5MB limit
      const maxSizeBytes = 5 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        alert('Profile image size must be less than 5MB.');
        e.target.value = '';
        return;
      }

      // 2. Format check: accept only jpg, jpeg, png (using regex)
      const allowedExtensions = /(\.jpg|\.jpeg|\.png)$/i;
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedExtensions.test(file.name) || !allowedMimeTypes.includes(file.type)) {
        alert('Only JPG, JPEG, and PNG images are accepted.');
        e.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!fullName || fullName.trim().length < 2) {
      alert('Please enter your full name (at least 2 characters).');
      return;
    }

    // Regex check on input fields
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address.');
      return;
    }

    if (!passwordRegex.test(password)) {
      alert('Encryption Key must be at least 8 characters long and contain both letters and numbers.');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      setIsSubmitting(true);
      setOtpError('');
      setResendStatus('');
      
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, profileImage, fullName })
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          alert(`An active authorization session is already in progress.\nPlease enter the OTP code sent to your email.\n\n${data.message}`);
          setOtpModalOpen(true);
          setCountdown(data.countdown || 300);
          return;
        }
        throw new Error(data.message || 'Signup failed.');
      }

      setOtpModalOpen(true);
      setCountdown(300); // 5 minutes resend block
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) return;

    try {
      setIsVerifying(true);
      setOtpError('');
      
      const res = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Verification failed.');
      }

      // Store tokens and user details
      localStorage.setItem('token', data.token);
      localStorage.setItem('email', data.user.email);
      if (data.user.fullName) {
        localStorage.setItem('fullName', data.user.fullName);
      }
      if (data.user.profileImageKey) {
        localStorage.setItem('profileImageKey', data.user.profileImageKey);
      }
      if (profileImage) {
        localStorage.setItem('profileImage', profileImage); // base64 fallback
      } else {
        localStorage.removeItem('profileImage');
      }

      setOtpModalOpen(false);
      navigate('/dashboard');
    } catch (err) {
      setOtpError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;

    try {
      setOtpError('');
      setResendStatus('Dispatching code...');
      
      const res = await fetch(`${API_URL}/api/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Resend failed.');
      }

      setResendStatus('A new authorization code has been dispatched.');
      setCountdown(300); // Reset timer to 5 minutes
    } catch (err) {
      setOtpError(err.message);
      setResendStatus('');
    }
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
          {/* Profile Image Field (Optional) */}
          <div className="profile-image-upload-section">
            <div className="profile-image-preview-container">
              <img
                src={profileImage || profileIcon}
                alt="Profile Preview"
                className={`profile-image-preview ${profileImage ? 'custom-uploaded' : 'default-placeholder'}`}
              />
              <label htmlFor="profile-image-upload" className="profile-upload-overlay" title="Upload profile image">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
              </label>
            </div>
            <div className="profile-image-info">
              <span className="profile-upload-label">PROFILE IMAGE (OPTIONAL)</span>
              <div className="profile-upload-actions">
                <label htmlFor="profile-image-upload" className="profile-upload-btn">
                  Choose Photo
                </label>
                {profileImage && (
                  <button
                    type="button"
                    className="profile-remove-btn"
                    onClick={() => setProfileImage(null)}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <input
              type="file"
              id="profile-image-upload"
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: 'none' }}
            />
          </div>

          <AuthInput
            label="FULL NAME"
            type="text"
            placeholder="Commander Shepherd"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            prefixIcon={profileIcon}
          />

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

          <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="button-spinner"></span>
                INITIALIZING ENGINE...
              </>
            ) : (
              <>
                REGISTER FLEET ACCESS <span className="submit-btn-arrow">→</span>
              </>
            )}
          </button>
        </form>

        <div className="auth-card-footer">
          <div className="footer-actions">
            <span className="footer-regular-text">Already have an account?</span>{' '}
            <button className="footer-link-btn" onClick={() => navigate('/login')}>
              login
            </button>
          </div>
          <div className="back-home-container">
            <button className="back-home-btn" onClick={() => navigate('/')}>
              ← Back to Home
            </button>
          </div>
        </div>
      </div>

      {/* OTP Verification Modal Overlay */}
      {otpModalOpen && (
        <div className="otp-modal-overlay">
          <div className="otp-modal-card">
            <h3 className="otp-modal-title">FLEET AUTHORIZATION KEY</h3>
            <p className="otp-modal-subtitle">
              Enter the 6-digit authorization code dispatched to <strong>{email}</strong>
            </p>
            
            <form onSubmit={handleVerifyOtp} className="otp-form">
              <input
                type="text"
                placeholder="000000"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="otp-input-element"
                required
                autoFocus
              />
              
              {otpError && <p className="otp-error-message">{otpError}</p>}
              {resendStatus && <p className="otp-status-message">{resendStatus}</p>}
              
              <button type="submit" className="otp-submit-btn" disabled={isVerifying}>
                {isVerifying ? 'VERIFYING SECURITY CODE...' : 'VERIFY AUTHORIZATION'}
              </button>
              
              <div className="otp-actions-row">
                <button
                  type="button"
                  className="otp-resend-btn"
                  onClick={handleResendOtp}
                  disabled={countdown > 0}
                >
                  {countdown > 0 
                    ? `Resend Code (${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')})`
                    : 'Resend Code'
                  }
                </button>
                <button
                  type="button"
                  className="otp-cancel-btn"
                  onClick={() => setOtpModalOpen(false)}
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

export default Signup;
