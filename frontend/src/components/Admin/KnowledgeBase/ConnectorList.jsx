import React, { useState, useEffect } from 'react';
import './ConnectorList.css';

const INITIAL_CONNECTORS = [
  {
    id: 'aws',
    name: 'AWS',
    sub: 'CloudFormation & Docs',
    status: 'Synced',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
      </svg>
    )
  },
  {
    id: 'docker',
    name: 'Docker',
    sub: 'Container Specs',
    status: 'Synced',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="9" y1="3" x2="9" y2="21"></line>
        <line x1="15" y1="3" x2="15" y2="21"></line>
        <line x1="3" y1="9" x2="21" y2="9"></line>
        <line x1="3" y1="15" x2="21" y2="15"></line>
      </svg>
    )
  },
  {
    id: 'terraform',
    name: 'Terraform',
    sub: 'HCL Modules',
    status: 'Needs Update',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"></polygon>
        <line x1="12" y1="22" x2="12" y2="12"></line>
        <line x1="12" y1="12" x2="22" y2="8.5"></line>
        <line x1="12" y1="12" x2="2" y2="8.5"></line>
      </svg>
    )
  },
  {
    id: 'cloudwatch',
    name: 'CloudWatch',
    sub: 'Log Metrics',
    status: 'Synced',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"></line>
        <line x1="12" y1="20" x2="12" y2="4"></line>
        <line x1="6" y1="20" x2="6" y2="14"></line>
      </svg>
    )
  },
  {
    id: 'vercel',
    name: 'Vercel',
    sub: 'Deployment Logs',
    status: 'Synced',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polygon points="12 2 22 20 2 20"></polygon>
      </svg>
    )
  }
];

function ConnectorList({ rebuildTriggered }) {
  const [connectors, setConnectors] = useState(INITIAL_CONNECTORS);

  // Sync Terraform when vector DB rebuild is triggered
  useEffect(() => {
    if (rebuildTriggered) {
      setConnectors((prev) => 
        prev.map((c) => c.id === 'terraform' ? { ...c, status: 'Synced' } : c)
      );
    }
  }, [rebuildTriggered]);

  const handleAddConnector = () => {
    const name = prompt('Enter the name of the new data source connector:');
    if (!name) return;
    
    const newSource = {
      id: name.toLowerCase().replace(' ', '-'),
      name: name,
      sub: 'Repository Index',
      status: 'Synced',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="16"></line>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
      )
    };
    setConnectors((prev) => [...prev, newSource]);
  };

  return (
    <div className="connectors-panel-card">
      <div className="connectors-header">
        <div className="header-left-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="connector-header-icon">
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
          </svg>
          <span className="panel-title-text">Connectors</span>
        </div>
        <span className="connectors-active-badge">8 Active</span>
      </div>

      <div className="connectors-list">
        {connectors.map((connector) => {
          const isSynced = connector.status === 'Synced';
          return (
            <div key={connector.id} className={`connector-row ${connector.id === 'terraform' && !isSynced ? 'needs-update-row' : ''}`}>
              <div className="connector-info-left">
                <div className={`connector-logo-wrapper ${isSynced ? 'synced' : 'warn'}`}>
                  {connector.icon}
                </div>
                <div className="connector-text-group">
                  <span className="connector-name">{connector.name}</span>
                  <span className="connector-sub">{connector.sub}</span>
                </div>
              </div>
              
              <div className="connector-status-right">
                {isSynced ? (
                  <span className="status-badge-synced">
                    <span className="status-dot green" />
                    Synced
                  </span>
                ) : (
                  <span className="status-badge-warn">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="warn-exclamation">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    Needs Update
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dashed outline Add Data Source button */}
      <button className="add-source-dashed-btn" onClick={handleAddConnector}>
        + Add Data Source
      </button>
    </div>
  );
}

export default ConnectorList;
