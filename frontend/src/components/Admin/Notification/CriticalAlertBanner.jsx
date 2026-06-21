import React from 'react';
import './CriticalAlertBanner.css';
import systemLatencyIcon from '../../../assets/system-latency.svg';

function CriticalAlertBanner({ onDismiss }) {
  return (
    <div className="critical-alert-banner">
      <div className="critical-alert-icon-wrap">
        <img src={systemLatencyIcon} alt="" className="critical-alert-icon" />
      </div>

      <div className="critical-alert-content">
        <h2 className="critical-alert-title">Critical System Latency Detected</h2>
        <p className="critical-alert-desc">
          Response times in us-east-1 cluster have exceeded 2,400ms threshold. AutoHeal agent
          is attempting mitigation. Manual intervention may be required.
        </p>
      </div>

      <div className="critical-alert-actions">
        <button
          type="button"
          className="critical-alert-investigate-btn"
          onClick={() => alert('Opening root cause analysis dashboard...')}
        >
          Investigate Root Cause
        </button>
        <button type="button" className="critical-alert-dismiss-btn" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

export default CriticalAlertBanner;
