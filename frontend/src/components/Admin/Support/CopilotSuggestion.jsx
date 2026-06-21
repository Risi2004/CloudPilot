import React from 'react';
import './CopilotSuggestion.css';

const RECOMMENDATIONS = {
  '#CP-8921': {
    text: 'Ticket #CP-8921 relates to an authorization block. AutoHeal analysis indicates an expired OAuth client secret in cluster vault namespace. Recommend executing rotation script.',
    buttonText: 'Rotate Secrets & Fix'
  },
  '#CP-8922': {
    text: "Ticket #CP-8922 likely relates to a known billing spike with auto-scaling group 'ASG-West-02' that occurred on June 14th. Suggest applying the standard credit refund policy.",
    buttonText: 'Apply Recommended Fix'
  },
  '#CP-8919': {
    text: 'User Mike K. is Pro plan owner and cleared OTP validation checks. Secret token generation request is safe. Suggest dispatching new node token.',
    buttonText: 'Approve & Dispatch'
  },
  '#CP-8918': {
    text: 'UI lag is caused by canvas style transitions on viewport resizing. Recommend pushing layout patch #182 to override transition rules for Safari.',
    buttonText: 'Apply Resizing Patch'
  },
  // Default recommendation fallback
  'default': {
    text: 'Analyze the conversation history to fetch cluster state details and auto-generate resolution steps.',
    buttonText: 'Analyze Ticket'
  }
};

function CopilotSuggestion({ activeTicketId, onApplyFix }) {
  const rec = RECOMMENDATIONS[activeTicketId] || RECOMMENDATIONS['default'];

  const handleFixClick = () => {
    if (onApplyFix) {
      onApplyFix(activeTicketId);
    } else {
      alert(`Fix applied for ticket ${activeTicketId}!`);
    }
  };

  return (
    <div className="copilot-suggestion-card">
      <div className="copilot-header">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="copilot-sparkle-icon">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
        <span className="copilot-title">AI Copilot Suggestion</span>
      </div>

      <div className="copilot-body">
        <p className="copilot-desc-text">
          {rec.text}
        </p>
        <button className="copilot-fix-btn" onClick={handleFixClick}>
          {rec.buttonText}
        </button>
      </div>
    </div>
  );
}

export default CopilotSuggestion;
