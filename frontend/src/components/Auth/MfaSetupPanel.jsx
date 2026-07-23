import React, { useEffect, useState } from 'react';
import { enableMfa, setupMfa } from '../../services/mfa';
import RecoveryCodesPanel from './RecoveryCodesPanel';
import './MfaAuth.css';

function MfaSetupPanel({ onSkip, onComplete, skipLabel = 'Skip for now' }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const data = await setupMfa();
        if (cancelled) return;
        setSecret(data.secret || '');
        setOtpauthUrl(data.otpauthUrl || '');
        setQrDataUrl(data.qrDataUrl || '');
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to start MFA setup.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleEnable = async (e) => {
    e.preventDefault();
    if (!code || code.length < 6) return;
    try {
      setSubmitting(true);
      setError('');
      const data = await enableMfa(code);
      setBackupCodes(data.backupCodes || []);
    } catch (err) {
      setError(err.message || 'Failed to enable MFA.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetrySetup = async () => {
    try {
      setLoading(true);
      setError('');
      setCode('');
      const data = await setupMfa();
      setSecret(data.secret || '');
      setOtpauthUrl(data.otpauthUrl || '');
      setQrDataUrl(data.qrDataUrl || '');
    } catch (err) {
      setError(err.message || 'Failed to start MFA setup.');
    } finally {
      setLoading(false);
    }
  };

  if (backupCodes) {
    return (
      <RecoveryCodesPanel
        codes={backupCodes}
        onContinue={() => onComplete?.()}
        continueLabel="Continue"
      />
    );
  }

  return (
    <div className="mfa-panel mfa-setup-panel">
      <h3 className="mfa-panel-title">SET UP AUTHENTICATOR</h3>
      <p className="mfa-panel-subtitle">
        Optional — scan the QR code with Google Authenticator, Authy, or a similar app.
        You can skip and enable MFA later from your profile.
      </p>

      {error && (
        <div className="mfa-error-container" style={{ marginBottom: '15px', textAlign: 'center' }}>
          <p className="mfa-error-message" style={{ color: '#ef4444', marginBottom: '8px' }}>{error}</p>
          <button
            type="button"
            className="mfa-retry-link"
            onClick={handleRetrySetup}
            style={{
              background: 'none',
              border: 'none',
              color: '#00d4ff',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Regenerate QR Code / Try Again
          </button>
        </div>
      )}

      {!loading && (secret || qrDataUrl) && (
        <>
          {qrDataUrl && (
            <img src={qrDataUrl} alt="MFA QR code" className="mfa-qr-image" />
          )}
          <div className="mfa-secret-box">
            <span className="mfa-secret-label">Manual key</span>
            <code className="mfa-secret-value">{secret}</code>
          </div>
          {otpauthUrl && (
            <p className="mfa-otpauth-hint">otpauth URI ready for authenticator apps</p>
          )}

          <form onSubmit={handleEnable} className="mfa-form">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setError('');
                setCode(e.target.value.replace(/\D/g, ''));
              }}
              className="mfa-code-input"
              required
              autoFocus
            />
            <button type="submit" className="mfa-primary-btn" disabled={submitting || code.length !== 6}>
              {submitting ? 'VERIFYING…' : 'ENABLE MFA'}
            </button>
          </form>
        </>
      )}

      {onSkip && (
        <button type="button" className="mfa-skip-btn" onClick={onSkip} disabled={submitting}>
          {skipLabel}
        </button>
      )}
    </div>
  );
}

export default MfaSetupPanel;
