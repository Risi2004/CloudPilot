import React from 'react';
import './ProfileCard.css';
import './TerminalOperations.css';

function TerminalOperations() {
  const handlePurge = () => {
    if (window.confirm('This will permanently purge all project data. Continue?')) {
      console.log('Purge data requested');
    }
  };

  const handleKillAccount = () => {
    if (window.confirm('This will permanently delete your account. This action cannot be undone.')) {
      console.log('Kill account requested');
    }
  };

  return (
    <section className="vp-card terminal-operations-card">
      <div className="vp-card-header">
        <h3 className="vp-card-title">
          <svg className="vp-card-title-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          Terminal Operations
        </h3>
      </div>

      <p className="terminal-warning">
        Destructive actions below are irreversible. Proceed with caution.
      </p>

      <div className="terminal-actions">
        <button type="button" className="terminal-btn purge" onClick={handlePurge}>
          PURGE DATA
        </button>
        <button type="button" className="terminal-btn kill" onClick={handleKillAccount}>
          KILL ACCOUNT
        </button>
      </div>
    </section>
  );
}

export default TerminalOperations;
