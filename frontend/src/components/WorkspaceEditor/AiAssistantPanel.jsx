import React from 'react';
import cloudpilotAiIcon from '../../assets/cloudpilot-ai.svg';
import sendIcon from '../../assets/send.svg';

function AiAssistantPanel() {
  return (
    <aside className="ws-assistant-panel">
      <div className="ws-assistant-header">
        <div className="ws-assistant-title-row">
          <div className="ws-assistant-avatar">
            <img src={cloudpilotAiIcon} alt="AI" style={{ width: 16, height: 16 }} />
          </div>
          <h2 className="ws-assistant-title">CloudPilot Assistant</h2>
        </div>
        <button type="button" className="ws-icon-btn" aria-label="More options">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      </div>

      <div className="ws-assistant-body">
        <div className="ws-chat-bubble">Can I reduce cost?</div>

        <div className="ws-insight-card">
          <p className="ws-insight-label">OPTIMIZATION INSIGHT</p>
          <p className="ws-insight-text">
            Switching your backend from <strong>ECS</strong> to <strong>Railway</strong> could save you{' '}
            <strong>$18/month</strong> with similar performance for your current traffic.
          </p>
          <button type="button" className="ws-apply-btn">
            Apply migration path
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
          <button type="button" className="ws-breakdown-link">Show cost breakdown</button>
        </div>
      </div>

      <div className="ws-assistant-input-area">
        <div className="ws-input-row">
          <input
            type="text"
            className="ws-chat-input"
            placeholder="Ask CloudPilot something..."
            readOnly
          />
          <button type="button" className="ws-send-btn" aria-label="Send message">
            <img src={sendIcon} alt="Send" style={{ width: 14, height: 14 }} />
          </button>
        </div>
        <div className="ws-quick-actions">
          <button type="button" className="ws-quick-btn">/deploy</button>
          <button type="button" className="ws-quick-btn">/analyze_logs</button>
          <button type="button" className="ws-quick-btn">/cost</button>
        </div>
      </div>
    </aside>
  );
}

export default AiAssistantPanel;
