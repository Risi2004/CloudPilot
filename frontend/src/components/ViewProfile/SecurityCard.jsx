import React, { useEffect, useState } from 'react';
import MfaSetupPanel from '../Auth/MfaSetupPanel';
import RecoveryCodesPanel from '../Auth/RecoveryCodesPanel';
import {
  disableMfa,
  getMfaStatus,
  regenerateBackupCodes,
} from '../../services/mfa';
import './ProfileCard.css';
import './SecurityCard.css';
import '../Auth/MfaAuth.css';

function SecurityCard({
  currentPassword,
  newPassword,
  confirmPassword,
  mfaCode,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onMfaCodeChange,
  onPasswordSubmit,
  isLoading,
  passErrorMsg,
  passSuccessMsg,
}) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaSuccess, setMfaSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [freshBackupCodes, setFreshBackupCodes] = useState(null);
  const [regenCode, setRegenCode] = useState('');
  const [showRegen, setShowRegen] = useState(false);

  const refreshStatus = async () => {
    try {
      setStatusLoading(true);
      const data = await getMfaStatus();
      setMfaEnabled(!!data.mfaEnabled);
    } catch {
      // Keep last known state on transient errors
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleDisable = async (e) => {
    e.preventDefault();
    if (!disableCode.trim()) return;
    try {
      setActionLoading(true);
      setMfaError('');
      setMfaSuccess('');
      await disableMfa(disableCode.trim());
      setMfaEnabled(false);
      setShowDisable(false);
      setDisableCode('');
      setMfaSuccess('MFA disabled for this account.');
      setTimeout(() => setMfaSuccess(''), 4000);
    } catch (err) {
      setMfaError(err.message || 'Failed to disable MFA.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenerate = async (e) => {
    e.preventDefault();
    if (!regenCode.trim()) return;
    try {
      setActionLoading(true);
      setMfaError('');
      const data = await regenerateBackupCodes(regenCode.trim());
      setFreshBackupCodes(data.backupCodes || []);
      setShowRegen(false);
      setRegenCode('');
    } catch (err) {
      setMfaError(err.message || 'Failed to regenerate recovery codes.');
    } finally {
      setActionLoading(false);
    }
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

      <div className="security-mfa-block">
        <div className="security-mfa-status">
          <span className={`security-mfa-label ${mfaEnabled ? 'enabled' : ''}`}>
            {statusLoading ? 'MFA STATUS' : mfaEnabled ? 'MFA ENABLED' : 'MFA OPTIONAL'}
          </span>
          <p className="security-mfa-desc">
            {mfaEnabled
              ? 'Multi-factor authentication is active. Untrusted devices will require a code at login.'
              : 'Multi-factor authentication is not enabled on your account.'}
          </p>
        </div>

        {mfaError && <div className="vp-alert error">{mfaError}</div>}
        {mfaSuccess && <div className="vp-alert success">{mfaSuccess}</div>}

        {!mfaEnabled && !showSetup && (
          <button
            type="button"
            className="security-mfa-btn"
            onClick={() => {
              setShowSetup(true);
              setMfaError('');
            }}
          >
            ENABLE MFA
          </button>
        )}

        {mfaEnabled && !showDisable && !showRegen && !freshBackupCodes && (
          <div className="security-mfa-actions">
            <button
              type="button"
              className="security-mfa-btn danger"
              onClick={() => {
                setShowDisable(true);
                setMfaError('');
              }}
            >
              DISABLE MFA
            </button>
            <button
              type="button"
              className="security-mfa-btn"
              onClick={() => {
                setShowRegen(true);
                setMfaError('');
              }}
            >
              NEW RECOVERY CODES
            </button>
          </div>
        )}

        {showSetup && (
          <div className="security-mfa-embed">
            <MfaSetupPanel
              skipLabel="Cancel"
              onSkip={() => setShowSetup(false)}
              onComplete={() => {
                setShowSetup(false);
                setMfaEnabled(true);
                setMfaSuccess('MFA enabled successfully.');
                setTimeout(() => setMfaSuccess(''), 4000);
                refreshStatus();
              }}
            />
          </div>
        )}

        {showDisable && (
          <form onSubmit={handleDisable} className="security-password-form">
            <p className="security-mfa-desc">
              Enter an authenticator or recovery code to disable MFA.
            </p>
            <div className="security-field">
              <label className="security-label" htmlFor="disable-mfa-code">
                MFA CODE
              </label>
              <input
                id="disable-mfa-code"
                type="text"
                className="security-input"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                placeholder="000000 or recovery code"
                required
              />
            </div>
            <div className="security-mfa-actions">
              <button type="submit" className="security-save-btn" disabled={actionLoading}>
                {actionLoading ? 'DISABLING…' : 'CONFIRM DISABLE'}
              </button>
              <button
                type="button"
                className="security-toggle-password"
                onClick={() => setShowDisable(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {showRegen && (
          <form onSubmit={handleRegenerate} className="security-password-form">
            <p className="security-mfa-desc">
              Enter your authenticator code to generate a new set of recovery codes.
            </p>
            <div className="security-field">
              <label className="security-label" htmlFor="regen-mfa-code">
                AUTHENTICATOR CODE
              </label>
              <input
                id="regen-mfa-code"
                type="text"
                className="security-input"
                value={regenCode}
                onChange={(e) => setRegenCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                maxLength={6}
                required
              />
            </div>
            <div className="security-mfa-actions">
              <button type="submit" className="security-save-btn" disabled={actionLoading}>
                {actionLoading ? 'GENERATING…' : 'GENERATE CODES'}
              </button>
              <button
                type="button"
                className="security-toggle-password"
                onClick={() => setShowRegen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {freshBackupCodes && (
          <div className="security-mfa-embed">
            <RecoveryCodesPanel
              codes={freshBackupCodes}
              continueLabel="Done"
              onContinue={() => setFreshBackupCodes(null)}
            />
          </div>
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
            <label className="security-label" htmlFor="current-password">
              CURRENT PASSWORD
            </label>
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
            <label className="security-label" htmlFor="new-password">
              NEW PASSWORD
            </label>
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
            <label className="security-label" htmlFor="confirm-password">
              CONFIRM PASSWORD
            </label>
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
          {mfaEnabled && (
            <div className="security-field">
              <label className="security-label" htmlFor="password-mfa-code">
                MFA CODE
              </label>
              <input
                id="password-mfa-code"
                type="text"
                className="security-input"
                value={mfaCode || ''}
                onChange={(e) =>
                  onMfaCodeChange?.(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))
                }
                placeholder="Authenticator or recovery code"
                required
              />
            </div>
          )}
          <button type="submit" className="security-save-btn" disabled={isLoading}>
            {isLoading ? 'UPDATING...' : 'UPDATE PASSWORD'}
          </button>
        </form>
      )}
    </section>
  );
}

export default SecurityCard;
