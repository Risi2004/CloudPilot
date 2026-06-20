import React from 'react';
import rocketIcon from '../../assets/rocket.svg';

function ActionBar() {
  return (
    <div className="ws-action-bar">
      <div className="ws-action-bar-inner">
        <div className="ws-action-left">
          <div className="ws-current-estimate">
            <span className="ws-estimate-label">CURRENT ESTIMATE</span>
            <span className="ws-estimate-value">$42 <span>/ mo</span></span>
          </div>
          <div className="ws-valid-badge">
            <span className="ws-valid-dot" />
            Valid Config
          </div>
        </div>
        <div className="ws-action-right">
          <button type="button" className="ws-btn-ghost">Save Draft</button>
          <button type="button" className="ws-btn-outline">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Regenerate
          </button>
          <button type="button" className="ws-btn-primary">
            <img src={rocketIcon} alt="" style={{ width: 14, height: 14, marginRight: 6 }} />
            Deploy to Production
          </button>
        </div>
      </div>
    </div>
  );
}

export default ActionBar;
