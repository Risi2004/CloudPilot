import React, { useState } from 'react';
import './TroubleshootingAttemptHistory.css';

function TroubleshootingAttemptHistory({ attemptHistory }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="tah-wrapper">
      <span className="tah-title">Attempt History</span>
      {attemptHistory.map((a) => (
        <div key={a.attemptNumber} className="tah-row">
          <div className="tah-header" onClick={() => setExpanded(expanded === a.attemptNumber ? null : a.attemptNumber)}>
            <span>Attempt {a.attemptNumber}</span>
            <span className={`tah-outcome ${a.redeployOutcome && a.redeployOutcome.ok ? 'tah-outcome-ok' : 'tah-outcome-fail'}`}>
              {a.redeployOutcome && a.redeployOutcome.ok ? 'Resolved' : 'Still failing'}
            </span>
            <span className="tah-toggle">{expanded === a.attemptNumber ? '▲' : '▼'}</span>
          </div>
          {expanded === a.attemptNumber && (
            <div className="tah-details">
              {a.diagnosis && <p className="tah-detail-line">Root cause: {a.diagnosis.rootCause}</p>}
              {a.appliedFix && a.appliedFix.type === 'env' && <p className="tah-detail-line">Applied an environment variable fix.</p>}
              {a.appliedFix && a.appliedFix.type === 'code' && (
                <p className="tah-detail-line">Committed a fix to: {(a.appliedFix.files || []).join(', ')}</p>
              )}
              {a.commit && a.commit.url && (
                <a className="tah-commit-link" href={a.commit.url} target="_blank" rel="noreferrer">
                  View commit
                </a>
              )}
              {a.redeployOutcome && a.redeployOutcome.message && (
                <p className="tah-detail-line tah-detail-message">{a.redeployOutcome.message}</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default TroubleshootingAttemptHistory;
