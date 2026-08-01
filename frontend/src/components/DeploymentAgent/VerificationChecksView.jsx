import React, { useState } from 'react';
import './VerificationChecksView.css';

const STATUS_ICON = {
  pending: '○',
  running: '◐',
  pass: '✓',
  fail: '✕',
  skipped: '—',
};

function VerificationChecksView({ verification, onStop, stopping }) {
  const [expandedAttempt, setExpandedAttempt] = useState(null);
  const isActive = verification.status === 'running' || verification.status === 'stopping';

  return (
    <div className="vcv-wrapper">
      <div className="vcv-header">
        <h3 className="vcv-title">Verification Progress</h3>
        <span className={`vcv-status-pill vcv-status-${verification.status}`}>{verification.status.toUpperCase()}</span>
        <span className="vcv-attempt-badge">Attempt {verification.attempt || 1} / {verification.maxAttempts}</span>
        {isActive && (
          <button type="button" className="vcv-stop-btn" disabled={stopping} onClick={onStop}>
            {stopping ? 'Stopping...' : 'Stop'}
          </button>
        )}
      </div>

      <div className="vcv-checks-list">
        {(verification.checks || []).map((check) => (
          <div key={check.id} className={`vcv-check vcv-check-${check.status}`}>
            <span className="vcv-check-icon">{STATUS_ICON[check.status] || '○'}</span>
            <span className="vcv-check-title">{check.title}</span>
            {check.fixable && check.status === 'fail' && <span className="vcv-fixable-badge">CONFIG FIX ATTEMPTED</span>}
            {check.message && <span className="vcv-check-message">{check.message}</span>}
          </div>
        ))}
      </div>

      {(verification.attemptHistory || []).length > 0 && (
        <div className="vcv-history">
          <span className="vcv-history-title">Attempt History</span>
          {verification.attemptHistory.map((a) => (
            <div key={a.attemptNumber} className="vcv-attempt-row">
              <div
                className="vcv-attempt-header"
                onClick={() => setExpandedAttempt(expandedAttempt === a.attemptNumber ? null : a.attemptNumber)}
              >
                <span>Attempt {a.attemptNumber}</span>
                <span className="vcv-attempt-summary">
                  {a.checks.filter((c) => c.status === 'pass').length} passed, {a.checks.filter((c) => c.status === 'fail').length} failed
                  {a.appliedFixes.length > 0 ? `, ${a.appliedFixes.length} fix(es) applied` : ''}
                </span>
                <span className="vcv-attempt-toggle">{expandedAttempt === a.attemptNumber ? '▲' : '▼'}</span>
              </div>
              {expandedAttempt === a.attemptNumber && a.appliedFixes.length > 0 && (
                <div className="vcv-fixes-list">
                  {a.appliedFixes.map((fix, idx) => (
                    <div key={idx} className="vcv-fix-row">
                      <span className="font-mono">{fix.componentName}.{fix.key}</span>
                      <span className="vcv-fix-reason">{fix.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {verification.testAccount && verification.testAccount.email && (
        <div className="vcv-test-account">
          <span>Test account: <span className="font-mono">{verification.testAccount.email}</span></span>
          {verification.testAccount.cleanedUp ? (
            <span className="vcv-cleanup-ok">Cleaned up automatically</span>
          ) : (
            <span className="vcv-cleanup-warning">Could not be auto-removed - you may want to delete it manually</span>
          )}
        </div>
      )}

      {verification.status === 'succeeded' && (
        <div className="vcv-success-box">All verification checks passed.</div>
      )}

      {verification.status === 'failed' && verification.finalReport && (
        <div className="vcv-failed-box">
          <p className="vcv-failed-summary">{verification.finalReport.summary}</p>
          {(verification.finalReport.unresolved || []).map((u) => (
            <div key={u.id} className="vcv-unresolved-row">
              <span className="vcv-unresolved-title">{u.title}</span>
              <span className="vcv-unresolved-reason">{u.reason}</span>
            </div>
          ))}
        </div>
      )}

      {verification.status === 'stopped' && (
        <div className="vcv-stopped-box">Verification was stopped.</div>
      )}
    </div>
  );
}

export default VerificationChecksView;
