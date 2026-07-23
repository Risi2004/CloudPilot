import React, { useState } from 'react';
import { verifyMfaLogin } from '../../services/mfa';
import './MfaAuth.css';

function MfaChallengeModal({ mfaToken, onSuccess, onCancel }) {
  const [code, setCode] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    try {
      setSubmitting(true);
      setError('');
      const data = await verifyMfaLogin({
        mfaToken,
        code: code.trim(),
        rememberDevice,
      });
      onSuccess?.(data);
    } catch (err) {
      setError(err.message || 'Verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="otp-modal-overlay mfa-modal-overlay">
      <div className="otp-modal-card mfa-modal-card">
        <h3 className="otp-modal-title">MULTI-FACTOR CHECK</h3>
        <p className="otp-modal-subtitle">
          Enter the 6-digit code from your authenticator app, or a one-time recovery code.
        </p>

        <form onSubmit={handleSubmit} className="otp-form mfa-form">
          <input
            type="text"
            autoComplete="one-time-code"
            placeholder="000000 or recovery code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
            className="otp-input-element mfa-code-input"
            required
            autoFocus
          />

          <label className="mfa-remember-row">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
            />
            <span>Remember this device for 30 days</span>
          </label>

          {error && <p className="otp-error-message">{error}</p>}

          <button type="submit" className="otp-submit-btn" disabled={submitting}>
            {submitting ? 'VERIFYING…' : 'VERIFY & CONTINUE'}
          </button>

          {onCancel && (
            <button type="button" className="otp-cancel-btn" onClick={onCancel} disabled={submitting}>
              Cancel
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

export default MfaChallengeModal;
