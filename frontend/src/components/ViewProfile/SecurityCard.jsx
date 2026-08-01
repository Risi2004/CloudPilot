import React, { useState, useEffect } from 'react';
import './ProfileCard.css';
import './SecurityCard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function SecurityCard({
  currentPassword,
  newPassword,
  confirmPassword,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onPasswordSubmit,
  isLoading,
  passErrorMsg,
  passSuccessMsg,
}) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // MFA status
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [trustedDevices, setTrustedDevices] = useState([]);
  const [mfaError, setMfaError] = useState('');
  const [mfaSuccess, setMfaSuccess] = useState('');

  // Enrollment (setup) flow
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [setupCode, setSetupCode] = useState('');

  // Disable flow
  const [disableOpen, setDisableOpen] = useState(false);
  const [disableLoading, setDisableLoading] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');

  // Trusted devices panel
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [deviceActionLoading, setDeviceActionLoading] = useState(false);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const flashMessage = (setter, message) => {
    setter(message);
    setTimeout(() => setter(''), 4000);
  };

  useEffect(() => {
    const fetchMfaStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/mfa/status`, {
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error('Failed to load MFA status.');
        const data = await res.json();
        setMfaEnabled(!!data.mfaEnabled);
        setTrustedDevices(data.trustedDevices || []);
      } catch (err) {
        console.error('Failed to fetch MFA status:', err);
      } finally {
        setStatusLoading(false);
      }
    };

    fetchMfaStatus();
  }, []);

  const handleStartSetup = async () => {
    try {
      setSetupLoading(true);
      setMfaError('');
      const res = await fetch(`${API_URL}/api/auth/mfa/setup-init`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to start authenticator setup.');

      setQrCode(data.qrCode);
      setSecret(data.secret);
      setSetupCode('');
      setSetupOpen(true);
    } catch (err) {
      flashMessage(setMfaError, err.message);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleConfirmSetup = async (e) => {
    e.preventDefault();
    if (!setupCode) return;

    try {
      setSetupLoading(true);
      setMfaError('');
      const res = await fetch(`${API_URL}/api/auth/mfa/setup-verify`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ token: setupCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid authentication code.');

      setMfaEnabled(true);
      setSetupOpen(false);
      setQrCode('');
      setSecret('');
      setSetupCode('');
      flashMessage(setMfaSuccess, 'Two-factor authentication enabled successfully.');
    } catch (err) {
      flashMessage(setMfaError, err.message);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleDisableSubmit = async (e) => {
    e.preventDefault();
    if (!disablePassword) return;

    try {
      setDisableLoading(true);
      setMfaError('');
      const res = await fetch(`${API_URL}/api/auth/mfa/disable`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ password: disablePassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to disable MFA.');

      setMfaEnabled(false);
      setTrustedDevices([]);
      setDisableOpen(false);
      setDisablePassword('');
      setDevicesOpen(false);
      flashMessage(setMfaSuccess, 'Two-factor authentication disabled.');
    } catch (err) {
      flashMessage(setMfaError, err.message);
    } finally {
      setDisableLoading(false);
    }
  };

  const handleRevokeDevice = async (deviceId) => {
    try {
      setDeviceActionLoading(true);
      setMfaError('');
      const res = await fetch(`${API_URL}/api/auth/mfa/revoke-device`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ deviceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to revoke device.');

      setTrustedDevices(data.trustedDevices || []);
      flashMessage(setMfaSuccess, 'Device revoked. It will need a code on its next login.');
    } catch (err) {
      flashMessage(setMfaError, err.message);
    } finally {
      setDeviceActionLoading(false);
    }
  };

  const handleRevokeAllDevices = async () => {
    try {
      setDeviceActionLoading(true);
      setMfaError('');
      const res = await fetch(`${API_URL}/api/auth/mfa/revoke-device`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to revoke devices.');

      setTrustedDevices(data.trustedDevices || []);
      flashMessage(setMfaSuccess, 'All trusted devices revoked. A code will be required everywhere.');
    } catch (err) {
      flashMessage(setMfaError, err.message);
    } finally {
      setDeviceActionLoading(false);
    }
  };

  const formatExpiry = (isoDate) => {
    const date = new Date(isoDate);
    return `Trusted until ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <section className="vp-card security-card">
      <div className="vp-card-header">
        <h3 className="vp-card-title">
          <svg className="vp-card-title-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Security
        </h3>
      </div>

      {mfaError && <div className="vp-alert error">{mfaError}</div>}
      {mfaSuccess && <div className="vp-alert success">{mfaSuccess}</div>}

      <div className="security-mfa-block">
        {statusLoading ? (
          <span className="security-mfa-desc">Checking two-factor authentication status...</span>
        ) : mfaEnabled ? (
          <>
            <div className="security-mfa-status">
              <span className="security-mfa-label enabled">MFA ENABLED</span>
              <p className="security-mfa-desc">
                Your account requires an authenticator app code to log in from new devices.
              </p>
            </div>

            <div className="security-mfa-actions-row">
              <button
                type="button"
                className="security-toggle-password"
                onClick={() => setDevicesOpen(!devicesOpen)}
              >
                {devicesOpen ? 'Hide Trusted Devices' : `Manage Trusted Devices (${trustedDevices.length})`}
              </button>
              <button
                type="button"
                className="security-mfa-btn danger"
                onClick={() => setDisableOpen(!disableOpen)}
              >
                {disableOpen ? 'CANCEL' : 'DISABLE MFA'}
              </button>
            </div>

            {devicesOpen && (
              <div className="security-devices-list">
                {trustedDevices.length === 0 ? (
                  <span className="security-devices-empty">
                    No trusted devices. You'll be asked for a code every time you log in.
                  </span>
                ) : (
                  <>
                    {trustedDevices.map((device) => (
                      <div key={device.id} className="security-device-row">
                        <div className="security-device-info">
                          <span className="security-device-label" title={device.label}>{device.label}</span>
                          <span className="security-device-expiry">{formatExpiry(device.expiresAt)}</span>
                        </div>
                        <button
                          type="button"
                          className="security-device-revoke-btn"
                          disabled={deviceActionLoading}
                          onClick={() => handleRevokeDevice(device.id)}
                        >
                          REVOKE
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="security-save-btn"
                      disabled={deviceActionLoading}
                      onClick={handleRevokeAllDevices}
                    >
                      REVOKE ALL DEVICES
                    </button>
                  </>
                )}
              </div>
            )}

            {disableOpen && (
              <form onSubmit={handleDisableSubmit} className="security-mfa-setup-panel">
                <p className="security-mfa-desc">
                  Enter your password to disable two-factor authentication. This also clears all
                  trusted devices.
                </p>
                <input
                  type="password"
                  className="security-input"
                  placeholder="Current password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  required
                />
                <button type="submit" className="security-save-btn danger" disabled={disableLoading}>
                  {disableLoading ? 'DISABLING...' : 'CONFIRM DISABLE'}
                </button>
              </form>
            )}
          </>
        ) : (
          <>
            <div className="security-mfa-status">
              <span className="security-mfa-label">MFA REQUIRED</span>
              <p className="security-mfa-desc">
                Multi-factor authentication is not enabled on your account.
              </p>
            </div>
            {!setupOpen && (
              <button type="button" className="security-mfa-btn" onClick={handleStartSetup} disabled={setupLoading}>
                {setupLoading ? 'PREPARING...' : 'ENABLE MFA'}
              </button>
            )}

            {setupOpen && (
              <form onSubmit={handleConfirmSetup} className="security-mfa-setup-panel">
                <p className="security-mfa-desc">
                  Scan this QR code with your authenticator app, then enter the 6-digit code it
                  generates.
                </p>
                {qrCode && <img src={qrCode} alt="MFA QR Code" className="security-mfa-qr-image" />}
                {secret && (
                  <p className="security-mfa-secret-fallback">
                    Can't scan? Enter manually: <code>{secret}</code>
                  </p>
                )}
                <input
                  type="text"
                  className="security-input security-mfa-code-input"
                  placeholder="000000"
                  maxLength={6}
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                />
                <div className="security-mfa-actions-row">
                  <button type="submit" className="security-save-btn" disabled={setupLoading}>
                    {setupLoading ? 'VERIFYING...' : 'VERIFY & ENABLE'}
                  </button>
                  <button
                    type="button"
                    className="security-toggle-password"
                    onClick={() => { setSetupOpen(false); setQrCode(''); setSecret(''); }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      <div className="security-divider" />

      <button
        type="button"
        className="security-toggle-password"
        onClick={() => setShowPasswordForm(!showPasswordForm)}
      >
        {showPasswordForm ? 'Hide Password Settings' : 'Change Password'}
      </button>

      {showPasswordForm && (
        <form onSubmit={onPasswordSubmit} className="security-password-form">
          {passErrorMsg && <div className="vp-alert error">{passErrorMsg}</div>}
          {passSuccessMsg && <div className="vp-alert success">{passSuccessMsg}</div>}

          <div className="security-field">
            <label className="security-label" htmlFor="current-password">CURRENT PASSWORD</label>
            <input
              id="current-password"
              type="password"
              className="security-input"
              value={currentPassword}
              onChange={(e) => onCurrentPasswordChange(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <div className="security-field">
            <label className="security-label" htmlFor="new-password">NEW PASSWORD</label>
            <input
              id="new-password"
              type="password"
              className="security-input"
              value={newPassword}
              onChange={(e) => onNewPasswordChange(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <div className="security-field">
            <label className="security-label" htmlFor="confirm-password">CONFIRM PASSWORD</label>
            <input
              id="confirm-password"
              type="password"
              className="security-input"
              value={confirmPassword}
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="security-save-btn" disabled={isLoading}>
            {isLoading ? 'UPDATING...' : 'UPDATE PASSWORD'}
          </button>
        </form>
      )}
    </section>
  );
}

export default SecurityCard;
