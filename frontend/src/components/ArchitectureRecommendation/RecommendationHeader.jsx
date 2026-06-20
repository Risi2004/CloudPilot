import React from 'react';
import { useNavigate } from 'react-router-dom';
import './RecommendationHeader.css';

function RecommendationHeader({ repoUrl }) {
  const navigate = useNavigate();

  return (
    <div className="rec-header-wrapper">
      <div className="rec-header-meta">
        <h1 className="rec-header-title">Target Topology Blueprint</h1>
        <p className="rec-header-active-repo font-mono">
          <span className="rec-repo-label">TARGET REPO:</span>
          <span className="rec-repo-val" title={repoUrl}>{repoUrl}</span>
        </p>
      </div>

      <div className="rec-actions-container">
        <div className="rec-agents-pill-row">
          <div className="rec-agent-pill selection">
            <div className="rec-agent-pill-dot" />
            <div>
              <div className="rec-agent-pill-title">Platform Selection Agent</div>
              <div className="rec-agent-pill-status">STRATEGY CONFIRMED</div>
            </div>
          </div>
          <div className="rec-agent-pill recommendation">
            <div className="rec-agent-pill-dot" />
            <div>
              <div className="rec-agent-pill-title">Architecture Recommendation Agent</div>
              <div className="rec-agent-pill-status">TOPOLOGY COMPILED</div>
            </div>
          </div>
        </div>

        <button 
          type="button" 
          className="rec-cost-cta-btn"
          onClick={() => navigate(`/cost-estimation?url=${encodeURIComponent(repoUrl)}`)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
          Estimate Deployment Cost →
        </button>
      </div>
    </div>
  );
}

export default RecommendationHeader;
