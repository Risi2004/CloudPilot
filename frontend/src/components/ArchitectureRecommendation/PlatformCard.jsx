import React from 'react';
import './PlatformCard.css';

function PlatformCard({ platform, provider, details }) {
  // Mock data details based on provider
  const isAws = provider.toLowerCase().includes('aws');

  const pros = isAws 
    ? ['High redundancy & SLA guarantees', 'Granular IAM security control', 'Serverless container scalability']
    : ['Zero maintenance overhead', 'Automatic SSL/TLS provisioning', 'Highly competitive starting price'];

  const cons = isAws
    ? ['Requires NAT Gateway setup for private subnet database routing', 'Provisioning time of 2-3 minutes']
    : ['Limited to developer regions', 'Slightly higher pricing at high traffic tiers'];

  return (
    <div className="platform-card-wrapper">
      <div className="platform-header-row">
        <div>
          <span className="platform-agent-label font-mono">PLATFORM SELECTION AGENT</span>
          <h2 className="platform-title">{platform}</h2>
        </div>
        <div className="platform-score-badge">
          <span className="score-num">98%</span>
          <span className="score-label">MATCH SCORE</span>
        </div>
      </div>

      <p className="platform-description">
        Based on the code analysis, we selected <strong>{provider}</strong> as the optimal hosting solution.
      </p>

      <div className="platform-pros-cons-grid">
        <div className="pro-column">
          <h4 className="column-header pro">PROS & ADVANTAGES</h4>
          <ul className="column-list">
            {pros.map((p, idx) => (
              <li key={idx} className="list-item pro">
                <span className="bullet-icon pro">✓</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="con-column">
          <h4 className="column-header con">CONS & TRADEOFFS</h4>
          <ul className="column-list">
            {cons.map((c, idx) => (
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
          <span className="param-label">Runtime Provider</span>
          <span className="param-val">{provider}</span>
        </div>
        <div className="param-item">
          <span className="param-label">Execution Environment</span>
          <span className="param-val">{isAws ? 'Serverless Container (Fargate)' : 'PaaS Instance'}</span>
        </div>
        <div className="param-item">
          <span className="param-label">Isolation Level</span>
          <span className="param-val">Virtual Private Cloud (VPC)</span>
        </div>
      </div>
    </div>
  );
}

export default PlatformCard;
