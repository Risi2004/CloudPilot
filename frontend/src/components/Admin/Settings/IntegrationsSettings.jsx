import React from 'react';
import './IntegrationsSettings.css';

// SVG Icon from Assets
import integrationsIcon from '../../../assets/connectes.svg';

function IntegrationsSettings({
  githubOrg,
  awsAccessKey,
  stripeWebhook,
  ollamaEndpoint,
  vectorDb,
  onInputChange
}) {
  return (
    <div className="settings-card integrations-card">
      <div className="card-header-row">
        <div className="header-title-block">
          <img src={integrationsIcon} alt="Integrations" className="header-icon" />
          <h3 className="card-title">Integrations</h3>
        </div>
      </div>

      <div className="card-body">
        {/* Row 1: GitHub & Ollama */}
        <div className="settings-form-row">
          <div className="input-group">
            <label className="input-label">GitHub Organization</label>
            <div className="verified-input-wrapper">
              <input
                type="text"
                className="settings-input verified-input"
                value={githubOrg}
                onChange={(e) => onInputChange('githubOrg', e.target.value)}
                placeholder="Enter GitHub org token"
              />
              <span className="verification-badge" title="Verified Integration">
                {/* Green check SVG */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </span>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Ollama Endpoint (AI Engine)</label>
            <input
              type="text"
              className="settings-input"
              value={ollamaEndpoint}
              onChange={(e) => onInputChange('ollamaEndpoint', e.target.value)}
              placeholder="e.g. http://localhost:11434"
            />
          </div>
        </div>

        {/* Row 2: AWS & Vector DB */}
        <div className="settings-form-row">
          <div className="input-group">
            <label className="input-label">AWS IAM Access Key</label>
            <input
              type="text"
              className="settings-input font-mono"
              value={awsAccessKey}
              onChange={(e) => onInputChange('awsAccessKey', e.target.value)}
              placeholder="AKIA..."
            />
          </div>

          <div className="input-group">
            <label className="input-label">Vector Database (Pinecone/Milvus)</label>
            <input
              type="text"
              className="settings-input font-mono"
              value={vectorDb}
              onChange={(e) => onInputChange('vectorDb', e.target.value)}
              placeholder="grpc://cluster..."
            />
          </div>
        </div>

        {/* Row 3: Stripe & Auto-Sync Alert */}
        <div className="settings-form-row">
          <div className="input-group">
            <label className="input-label">Stripe Webhook Secret</label>
            <input
              type="password"
              className="settings-input font-mono"
              value={stripeWebhook}
              onChange={(e) => onInputChange('stripeWebhook', e.target.value)}
              placeholder="whsec_..."
            />
          </div>

          {/* Auto-Sync Alert Card */}
          <div className="auto-sync-card">
            <div className="auto-sync-icon-block">
              {/* Glowing lightning bolt icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sync-lightning-svg">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </div>
            <div className="auto-sync-content">
              <span className="auto-sync-title">Auto-Sync Active</span>
              <span className="auto-sync-desc">
                Credentials are rotated automatically every 30 days via Vault.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IntegrationsSettings;
