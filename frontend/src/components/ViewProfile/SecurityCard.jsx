import React, { useState } from 'react';
import './ProfileCard.css';
import './SecurityCard.css';

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
          <span className="security-mfa-label">MFA REQUIRED</span>
          <p className="security-mfa-desc">
            Multi-factor authentication is not enabled on your account.
          </p>
        </div>
        <button type="button" className="security-mfa-btn">ENABLE MFA</button>
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
