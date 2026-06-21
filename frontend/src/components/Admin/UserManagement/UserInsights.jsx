import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './UserInsights.css';

// SVG Assets
import sparklesIcon from '../../../assets/ai-reccomendations.svg';

function UserInsights() {
  const navigate = useNavigate();
  const [isCampaignExecuting, setIsCampaignExecuting] = useState(false);
  const [isCampaignCompleted, setIsCampaignCompleted] = useState(false);

  const handleExecuteCampaign = () => {
    if (isCampaignCompleted || isCampaignExecuting) return;
    setIsCampaignExecuting(true);
    
    // Simulate sending 50 emails
    setTimeout(() => {
      setIsCampaignExecuting(false);
      setIsCampaignCompleted(true);
    }, 2000);
  };

  return (
    <div className="user-insights-row">
      
      {/* AI Insights Card */}
      <div className={`user-insight-card ai-insights-card ${isCampaignCompleted ? 'completed' : ''}`}>
        <div className="insight-card-header">
          <img src={sparklesIcon} alt="AI Sparkles" className="insight-sparkles-icon" />
          <span className="insight-card-title">AI Insights</span>
        </div>
        
        <p className="insight-card-text">
          {isCampaignExecuting ? (
            <span className="loading-state">
              <svg className="insight-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <circle cx="12" cy="12" r="10" strokeDasharray="40 20" strokeLinecap="round" />
              </svg>
              Analyzing computing metrics & dispatching upgrade offers...
            </span>
          ) : isCampaignCompleted ? (
            "Auto-invite campaign completed. Upgrade invitations dispatched to the top 50 high-activity Free tier accounts."
          ) : (
            "We've detected a 15% increase in Free plan users exceeding their compute limits. Recommend bulk-sending \"Pro\" upgrade invitations to the top 50 users based on activity volume."
          )}
        </p>

        {!isCampaignCompleted && (
          <button 
            className={`insight-action-btn ${isCampaignExecuting ? 'loading' : ''}`}
            onClick={handleExecuteCampaign}
            disabled={isCampaignExecuting}
          >
            {isCampaignExecuting ? 'DISPATCHING CAMPAIGN...' : 'EXECUTE AUTO-INVITE CAMPAIGN'}
            {!isCampaignExecuting && <span className="arrow-icon">→</span>}
          </button>
        )}

        {isCampaignCompleted && (
          <div className="campaign-success-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            CAMPAIGN DISPATCHED SUCCESSFULLY
          </div>
        )}
      </div>

      {/* Recent Security Event Card */}
      <div className="user-insight-card security-event-card">
        <div className="security-event-content">
          <div className="security-event-details">
            <span className="security-card-title">Recent Security Event</span>
            <p className="security-event-text">
              Unauthorized login attempt blocked for account 
              <strong className="blocked-account-text"> admin@gmail.com</strong>
            </p>
          </div>
          <button 
            className="view-audit-log-btn"
            onClick={() => navigate('/admin/dashboard')}
          >
            View Audit Log
          </button>
        </div>
      </div>

    </div>
  );
}

export default UserInsights;
