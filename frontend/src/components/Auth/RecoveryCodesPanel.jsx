import React, { useState } from 'react';
import './MfaAuth.css';

function RecoveryCodesPanel({ codes, onContinue, continueLabel = 'Continue' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob(
      [
        'CloudPilot MFA Recovery Codes\n',
        'Store these in a safe place. Each code can be used once.\n\n',
        codes.join('\n'),
        '\n',
      ],
      { type: 'text/plain' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cloudpilot-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mfa-panel recovery-codes-panel">
      <h3 className="mfa-panel-title">SAVE RECOVERY CODES</h3>
      <p className="mfa-panel-subtitle">
        These one-time codes can unlock your account if you lose your authenticator.
        Copy or download them now — they will not be shown again.
      </p>
      <ul className="recovery-codes-list">
        {codes.map((code) => (
          <li key={code} className="recovery-code-item">
            {code}
          </li>
        ))}
      </ul>
      <div className="mfa-actions-row">
        <button type="button" className="mfa-secondary-btn" onClick={handleCopy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button type="button" className="mfa-secondary-btn" onClick={handleDownload}>
          Download
        </button>
      </div>
      {onContinue && (
        <button type="button" className="mfa-primary-btn" onClick={onContinue}>
          {continueLabel}
        </button>
      )}
    </div>
  );
}

export default RecoveryCodesPanel;
