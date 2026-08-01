import React, { useState } from 'react';
import './PlatformCredentialsPanel.css';

const PLATFORM_META = {
  render: {
    label: 'Render',
    keyUrl: 'https://dashboard.render.com/u/settings#api-keys',
    hint: 'Account Settings -> API Keys -> Create API Key',
  },
  vercel: {
    label: 'Vercel',
    keyUrl: 'https://vercel.com/account/tokens',
    hint: 'Account Settings -> Tokens -> Create Token',
  },
};

function PlatformCredentialsPanel({ requiredPlatforms, credentials, onConnect, onRemove }) {
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState({});
  const [errors, setErrors] = useState({});

  const connectedMap = Object.fromEntries((credentials || []).map((c) => [c.platform, c]));

  const handleConnect = async (platform) => {
    const apiKey = (drafts[platform] || '').trim();
    if (!apiKey) return;
    setSaving((s) => ({ ...s, [platform]: true }));
    setErrors((e) => ({ ...e, [platform]: null }));
    try {
      await onConnect(platform, apiKey);
      setDrafts((d) => ({ ...d, [platform]: '' }));
    } catch (err) {
      setErrors((e) => ({ ...e, [platform]: err.message }));
    } finally {
      setSaving((s) => ({ ...s, [platform]: false }));
    }
  };

  return (
    <div className="pcp-wrapper">
      <div className="pcp-header">
        <h3 className="pcp-title">Connect Your Deployment Platforms</h3>
        <p className="pcp-subtitle">
          This architecture requires accounts on the platforms below. Your API keys are encrypted at rest and are only
          used to create and manage the resources for this deployment.
        </p>
      </div>

      <div className="pcp-cards">
        {requiredPlatforms.map((platform) => {
          const meta = PLATFORM_META[platform] || { label: platform, keyUrl: '#', hint: '' };
          const connected = connectedMap[platform];

          return (
            <div key={platform} className={`pcp-card ${connected ? 'connected' : ''}`}>
              <div className="pcp-card-header">
                <span className="pcp-platform-name">{meta.label}</span>
                {connected && <span className="pcp-connected-badge">CONNECTED</span>}
              </div>

              {connected ? (
                <div className="pcp-connected-row">
                  <span className="pcp-masked-key font-mono">{connected.maskedKey}</span>
                  {connected.accountLabel && <span className="pcp-account-label">{connected.accountLabel}</span>}
                  <button type="button" className="pcp-remove-btn" onClick={() => onRemove(platform)}>
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <a href={meta.keyUrl} target="_blank" rel="noreferrer" className="pcp-key-link">
                    Get your {meta.label} API key -&gt;
                  </a>
                  {meta.hint && <p className="pcp-hint">{meta.hint}</p>}
                  <div className="pcp-input-row">
                    <input
                      type="password"
                      className="pcp-key-input"
                      placeholder={`Paste your ${meta.label} API key`}
                      value={drafts[platform] || ''}
                      onChange={(e) => setDrafts((d) => ({ ...d, [platform]: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="pcp-connect-btn"
                      disabled={!(drafts[platform] || '').trim() || saving[platform]}
                      onClick={() => handleConnect(platform)}
                    >
                      {saving[platform] ? 'Validating...' : 'Connect'}
                    </button>
                  </div>
                  {errors[platform] && <div className="pcp-error">{errors[platform]}</div>}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PlatformCredentialsPanel;
