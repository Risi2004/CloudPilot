import React from 'react';
import awsIcon from '../../assets/aws.svg';

function ProjectHeader() {
  return (
    <header className="ws-project-bar">
      <div className="ws-project-left">
        <div>
          <p className="ws-project-label">PROJECT</p>
          <div className="ws-project-name-box">
            <h1 className="ws-project-name">FoodLoop</h1>
          </div>
        </div>
        <div className="ws-tech-stack">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          React + Node.js + MongoDB
        </div>
      </div>

      <div className="ws-project-right">
        <div className="ws-meta-block">
          <span className="ws-meta-label">CLOUD PROVIDER</span>
          <div className="ws-meta-value">
            <img src={awsIcon} alt="AWS" />
            AWS
          </div>
        </div>
        <div className="ws-meta-block">
          <span className="ws-meta-label">ESTIMATED COST</span>
          <span className="ws-cost-value">$42/month</span>
        </div>
      </div>
    </header>
  );
}

export default ProjectHeader;
