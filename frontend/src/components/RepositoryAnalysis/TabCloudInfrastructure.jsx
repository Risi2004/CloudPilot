import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function TabCloudInfrastructure({ data }) {
  const navigate = useNavigate();
  const [infraTab, setInfraTab] = useState('costs');
  const [copied, setCopied] = useState(false);

  const getInfraCode = () => {
    if (infraTab === 'terraform') {
      return data.iac?.terraform || '';
    }
    return data.cicd?.yaml || '';
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getInfraCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const costBreakdown = data.iac?.monthlyCost || [];

  return (
    <div className="tab-pane-content">
      <div className="tab-pane-header">
        <h3 className="tab-pane-title">Cloud Infrastructure & Automation</h3>
        <p className="tab-pane-subtitle">Optimal hosting designs, cost breakdowns, and pipeline automation codes.</p>
      </div>

      <div className="infra-grid-layout">
        {/* Left column: Overview & Cost Breakdowns */}
        <div className="infra-overview-column">
          <div className="infra-spec-card">
            <h4 className="infra-spec-card-title">RECOMMENDED CLOUD PLATFORM</h4>
            <div className="infra-spec-card-val provider">{data.iac?.provider}</div>
            <p className="infra-spec-card-desc">Selected for optimal docker integration and serverless database scaling options.</p>
            <button
              type="button"
              className="infra-action-cta-btn"
              onClick={() => navigate(`/architecture-recommendation?url=${encodeURIComponent(data.url)}`)}
              style={{
                marginTop: '12px',
                background: 'rgba(0, 212, 255, 0.08)',
                border: '1px solid rgba(0, 212, 255, 0.25)',
                borderRadius: '6px',
                color: '#00d4ff',
                fontFamily: 'inherit',
                fontSize: '12px',
                fontWeight: '600',
                padding: '8px 14px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: 'flex-start'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(0, 212, 255, 0.15)';
                e.currentTarget.style.borderColor = '#00d4ff';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(0, 212, 255, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.25)';
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
                <polygon points="12 2 2 22 22 22"></polygon>
              </svg>
              View Visual Architecture Plan →
            </button>
          </div>

          <div className="infra-spec-card">
            <h4 className="infra-spec-card-title">ARCHITECTURAL TOPOLOGY</h4>
            <div className="infra-spec-card-val">{data.iac?.architecture}</div>
          </div>

          <div className="infra-spec-card">
            <h4 className="infra-spec-card-title">MONTHLY HOSTING COST BREAKDOWN</h4>
            <div className="cost-breakdown-list">
              {costBreakdown.map((item, idx) => (
                <div key={idx} className={`cost-breakdown-row ${item.total ? 'total-row' : ''}`}>
                  <span>{item.item || (item.total ? 'ESTIMATED TOTAL' : '')}</span>
                  <span className="cost-val">{item.cost || (item.total ? item.total.split(': ')[1] : '')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Terraform / CICD code blocks */}
        <div className="infra-code-column">
          <div className="infra-code-tabs-header">
            <div className="infra-code-tabs">
              <button
                className={`infra-tab-btn ${infraTab === 'costs' ? 'active' : ''}`}
                onClick={() => setInfraTab('costs')}
              >
                CI/CD Pipeline
              </button>
              <button
                className={`infra-tab-btn ${infraTab === 'terraform' ? 'active' : ''}`}
                onClick={() => setInfraTab('terraform')}
              >
                Terraform (IaC)
              </button>
            </div>

            {infraTab !== 'costs' || data.cicd?.yaml ? (
              <button onClick={handleCopy} className="code-copy-btn compact">
                {copied ? (
                  <span className="copied-text">✓ Copied!</span>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>Copy</span>
                  </>
                )}
              </button>
            ) : null}
          </div>

          <div className="infra-code-display-body">
            {infraTab === 'costs' ? (
              data.cicd?.yaml ? (
                <pre className="infra-code-pre">
                  <code className="infra-code-inner">{data.cicd.yaml}</code>
                </pre>
              ) : (
                <div className="code-placeholder-box">No CI/CD template generated for this repo profile.</div>
              )
            ) : (
              <pre className="infra-code-pre">
                <code className="infra-code-inner">{data.iac?.terraform}</code>
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TabCloudInfrastructure;
