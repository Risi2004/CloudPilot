import React from 'react';
import awsIcon from '../../assets/aws.svg';
import vercelIcon from '../../assets/vercel.svg';
import railwayIcon from '../../assets/railway.svg';
import './ProfileCard.css';
import './ActiveIntegrations.css';

const INTEGRATIONS = [
  { id: 'aws', name: 'AWS', icon: awsIcon, status: 'live' },
  { id: 'vercel', name: 'Vercel', icon: vercelIcon, status: 'live' },
  { id: 'railway', name: 'Railway', icon: railwayIcon, status: 'live' },
];

function ActiveIntegrations() {
  return (
    <section className="vp-card active-integrations-card">
      <div className="vp-card-header">
        <h3 className="vp-card-title">
          <svg className="vp-card-title-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          Active Integrations
        </h3>
        <span className="vp-card-badge live">3 LIVE</span>
      </div>

      <div className="integrations-grid">
        {INTEGRATIONS.map((item) => (
          <div key={item.id} className="integration-tile">
            <div className="integration-tile-top">
              <img src={item.icon} alt={item.name} className="integration-logo" />
              <span className="integration-status-dot" />
            </div>
            <span className="integration-name">{item.name}</span>
            <button type="button" className="integration-manage-link">MANAGE</button>
          </div>
        ))}

        <button type="button" className="integration-connect-tile">
          <span className="connect-plus">+</span>
          <span className="connect-label">CONNECT</span>
        </button>
      </div>
    </section>
  );
}

export default ActiveIntegrations;
