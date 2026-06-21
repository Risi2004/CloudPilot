import React from 'react';
import './ProfileCard.css';
import './AccessTokens.css';

const TOKENS = [
  { id: 1, name: 'AWS Key', prefix: 'cp_aws_••••••••' },
];

function AccessTokens() {
  return (
    <section className="vp-card access-tokens-card">
      <div className="vp-card-header">
        <h3 className="vp-card-title">
          <svg className="vp-card-title-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
          Access Tokens
        </h3>
        <button type="button" className="token-add-btn" aria-label="Add token">+</button>
      </div>

      <div className="token-list">
        {TOKENS.map((token) => (
          <div key={token.id} className="token-row">
            <div className="token-info">
              <span className="token-name">{token.name}</span>
              <span className="token-prefix">{token.prefix}</span>
            </div>
            <button type="button" className="token-menu-btn" aria-label="Token options">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default AccessTokens;
