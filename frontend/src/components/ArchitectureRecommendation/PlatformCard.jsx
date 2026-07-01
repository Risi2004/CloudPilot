import React from 'react';
import './PlatformCard.css';

function PlatformCard({ blueprint, primaryPlatform }) {
  const assignment = blueprint?.platform_assignment || [];
  const inventory = blueprint?.service_inventory || [];

  const pros = assignment.slice(0, 3).map((a) => `${a.service_id} → ${a.platform}: ${a.reason}`);
  const cons = (blueprint?.architectural_risks || []).slice(0, 3).map((r) => r.risk);

  return (
    <div className="platform-card-wrapper">
      <div className="platform-header-row">
        <div>
          <span className="platform-agent-label font-mono">ARCHITECTURE AGENT</span>
          <h2 className="platform-title">{primaryPlatform || 'Deployment Architecture'}</h2>
        </div>
        <div className="platform-score-badge">
          <span className="score-num">{Math.round((blueprint?.confidence_score || 0) * 100)}%</span>
          <span className="score-label">CONFIDENCE</span>
        </div>
      </div>

      <p className="platform-description">
        {blueprint?.overall_summary || 'Architecture blueprint generated from repository analysis and platform selection.'}
      </p>

      <div className="platform-pros-cons-grid">
        <div className="pro-column">
          <h4 className="column-header pro">PLATFORM ASSIGNMENTS</h4>
          <ul className="column-list">
            {(pros.length ? pros : ['No assignments generated']).map((p, idx) => (
              <li key={idx} className="list-item pro">
                <span className="bullet-icon pro">✓</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="con-column">
          <h4 className="column-header con">ARCHITECTURAL RISKS</h4>
          <ul className="column-list">
            {(cons.length ? cons : ['No major risks identified']).map((c, idx) => (
              <li key={idx} className="list-item con">
                <span className="bullet-icon con">⚠</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="platform-parameters">
        <div className="param-item">
          <span className="param-label">Services</span>
          <span className="param-val">{inventory.length} component(s)</span>
        </div>
        <div className="param-item">
          <span className="param-label">Application Type</span>
          <span className="param-val">{(blueprint?.application_type || 'unknown').replace(/_/g, ' ')}</span>
        </div>
        <div className="param-item">
          <span className="param-label">Infrastructure</span>
          <span className="param-val">{(blueprint?.infrastructure_requirements || []).slice(0, 2).join(', ') || '—'}</span>
        </div>
      </div>
    </div>
  );
}

export default PlatformCard;
