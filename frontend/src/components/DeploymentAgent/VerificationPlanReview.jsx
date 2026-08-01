import React from 'react';
import './VerificationPlanReview.css';

function SectionFields({ title, section, onChange, showTokenField, showAuthMethod }) {
  return (
    <div className="vpr-section">
      <div className="vpr-section-header">
        <span className="vpr-section-title">{title}</span>
        <label className="vpr-toggle">
          <input
            type="checkbox"
            checked={section.enabled}
            onChange={(e) => onChange({ ...section, enabled: e.target.checked })}
          />
          Enabled
        </label>
      </div>
      {section.enabled && (
        <div className="vpr-fields-grid">
          <label className="vpr-field">
            <span>Path</span>
            <input value={section.path || ''} onChange={(e) => onChange({ ...section, path: e.target.value })} placeholder="/api/auth/register" />
          </label>
          <label className="vpr-field">
            <span>Method</span>
            <input value={section.method || ''} onChange={(e) => onChange({ ...section, method: e.target.value })} placeholder="POST" />
          </label>
          {section.fields && (
            <>
              <label className="vpr-field">
                <span>Email field name</span>
                <input
                  value={(section.fields && section.fields.email) || ''}
                  onChange={(e) => onChange({ ...section, fields: { ...section.fields, email: e.target.value } })}
                  placeholder="email"
                />
              </label>
              <label className="vpr-field">
                <span>Password field name</span>
                <input
                  value={(section.fields && section.fields.password) || ''}
                  onChange={(e) => onChange({ ...section, fields: { ...section.fields, password: e.target.value } })}
                  placeholder="password"
                />
              </label>
            </>
          )}
          {showTokenField && (
            <label className="vpr-field">
              <span>Token field in response (leave blank if cookie-based)</span>
              <input value={section.tokenField || ''} onChange={(e) => onChange({ ...section, tokenField: e.target.value })} placeholder="token" />
            </label>
          )}
          {showAuthMethod && (
            <label className="vpr-field">
              <span>Auth method</span>
              <select value={section.authMethod || 'bearer'} onChange={(e) => onChange({ ...section, authMethod: e.target.value })}>
                <option value="bearer">Bearer token header</option>
                <option value="cookie">Cookie</option>
              </select>
            </label>
          )}
        </div>
      )}
    </div>
  );
}

function VerificationPlanReview({ testPlan, onChange, onStart, starting, error }) {
  const update = (key, section) => onChange({ ...testPlan, [key]: section });

  return (
    <div className="vpr-wrapper">
      <div className="vpr-header">
        <h3 className="vpr-title">Review Verification Plan</h3>
        <p className="vpr-subtitle">
          CloudPilot inferred these auth endpoints from your repository's source code. Review and correct anything before
          starting - registration/login checks will create a disposable test account on your live database.
        </p>
      </div>

      <SectionFields title="Registration" section={testPlan.registration} onChange={(s) => update('registration', s)} />
      <SectionFields title="Login" section={testPlan.login} onChange={(s) => update('login', s)} showTokenField />
      <SectionFields title="Protected Route" section={testPlan.protectedRoute} onChange={(s) => update('protectedRoute', s)} showAuthMethod />
      <SectionFields title="Delete Test Account (optional)" section={testPlan.deleteAccount} onChange={(s) => update('deleteAccount', s)} showAuthMethod />

      {!testPlan.deleteAccount.enabled && (testPlan.registration.enabled || testPlan.login.enabled) && (
        <p className="vpr-cleanup-warning">
          No account-deletion endpoint is configured, so the disposable test account created during verification will not
          be automatically removed. You can enable it above if your app has one.
        </p>
      )}

      {error && <div className="vpr-error-banner">{error}</div>}

      <button type="button" className="vpr-start-btn" disabled={starting} onClick={onStart}>
        {starting ? 'Starting...' : 'Start Verification'}
      </button>
    </div>
  );
}

export default VerificationPlanReview;
