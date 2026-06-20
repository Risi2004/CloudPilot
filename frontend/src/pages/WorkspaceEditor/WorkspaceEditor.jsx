import React from 'react';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import awsIcon from '../../assets/aws.svg';
import './WorkspaceEditor.css';

function WorkspaceEditor() {
  return (
    <DashboardLayout>
      <div className="ws-page">

        {/* Project header bar */}
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

        {/* Sub-navigation tabs */}
        <nav className="ws-tabs" aria-label="Workspace sections">
          <button type="button" className="ws-tab">Architecture</button>
          <button type="button" className="ws-tab active">Infrastructure</button>
          <button type="button" className="ws-tab">Deployment</button>
          <button type="button" className="ws-tab">Environment</button>
          <button type="button" className="ws-tab">Documentation</button>
        </nav>

        {/* Main content */}
        <div className="ws-main">

          {/* Left column */}
          <div className="ws-left-col">

            {/* Cloud Resources */}
            <section>
              <div className="ws-section-header">
                <h2 className="ws-section-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="8" rx="2" />
                    <rect x="2" y="14" width="20" height="8" rx="2" />
                    <line x1="6" y1="6" x2="6.01" y2="6" />
                    <line x1="6" y1="18" x2="6.01" y2="18" />
                  </svg>
                  Cloud Resources
                </h2>
                <button type="button" className="ws-add-resource">
                  + Add Resource
                </button>
              </div>

              <div className="ws-resource-cards">
                <article className="ws-resource-card">
                  <div className="ws-resource-card-header">
                    <div className="ws-resource-icon-title">
                      <div className="ws-resource-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="3" width="20" height="14" rx="2" />
                          <line x1="8" y1="21" x2="16" y2="21" />
                          <line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                      </div>
                      <div>
                        <p className="ws-resource-name">Frontend Instance</p>
                        <p className="ws-resource-type">AWS Fargate Service</p>
                      </div>
                    </div>
                    <button type="button" className="ws-edit-btn" aria-label="Edit frontend instance">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  </div>
                  <div className="ws-resource-specs">
                    <span className="ws-spec-chip">1 vCPU</span>
                    <span className="ws-spec-chip">1GB RAM</span>
                  </div>
                </article>

                <article className="ws-resource-card">
                  <div className="ws-resource-card-header">
                    <div className="ws-resource-icon-title">
                      <div className="ws-resource-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="2" width="20" height="8" rx="2" />
                          <rect x="2" y="14" width="20" height="8" rx="2" />
                          <line x1="6" y1="6" x2="6.01" y2="6" />
                          <line x1="6" y1="18" x2="6.01" y2="18" />
                        </svg>
                      </div>
                      <div>
                        <p className="ws-resource-name">Backend Instance</p>
                        <p className="ws-resource-type">AWS ECS Cluster Node</p>
                      </div>
                    </div>
                    <button type="button" className="ws-edit-btn" aria-label="Edit backend instance">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  </div>
                  <div className="ws-resource-specs">
                    <span className="ws-spec-chip">2 vCPU</span>
                    <span className="ws-spec-chip">4GB RAM</span>
                  </div>
                </article>
              </div>
            </section>

            {/* Terraform code editor */}
            <section className="ws-terraform-panel">
              <div className="ws-terraform-header">
                <div className="ws-terraform-title-row">
                  <h2 className="ws-terraform-title">Terraform</h2>
                  <span className="ws-version-badge">v1.5.0</span>
                </div>
                <div className="ws-terraform-actions">
                  <button type="button" className="ws-icon-btn" aria-label="Copy code">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                  <button type="button" className="ws-icon-btn" aria-label="Download code">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="ws-file-tabs">
                <button type="button" className="ws-file-tab active">main.tf</button>
                <button type="button" className="ws-file-tab">variables.tf</button>
              </div>

              <div className="ws-code-editor">
                <pre className="ws-code-block"><code>
                  <div className="ws-line"><span className="ws-line-num">1</span><span className="ws-line-content"><span className="ws-kw">resource</span> <span className="ws-str">"aws_ecs_cluster"</span> <span className="ws-str">"main"</span> {'{'}</span></div>
                  <div className="ws-line"><span className="ws-line-num">2</span><span className="ws-line-content">  <span className="ws-prop">name</span> = <span className="ws-str">"foodloop-cluster"</span></span></div>
                  <div className="ws-line"><span className="ws-line-num">3</span><span className="ws-line-content">{'  '}</span></div>
                  <div className="ws-line"><span className="ws-line-num">4</span><span className="ws-line-content">  <span className="ws-prop">setting</span> {'{'}</span></div>
                  <div className="ws-line"><span className="ws-line-num">5</span><span className="ws-line-content">    <span className="ws-prop">name</span>  = <span className="ws-str">"containerInsights"</span></span></div>
                  <div className="ws-line"><span className="ws-line-num">6</span><span className="ws-line-content">    <span className="ws-prop">value</span> = <span className="ws-str">"enabled"</span></span></div>
                  <div className="ws-line"><span className="ws-line-num">7</span><span className="ws-line-content">  {'}'}</span></div>
                  <div className="ws-line"><span className="ws-line-num">8</span><span className="ws-line-content">{'}'}</span></div>
                  <div className="ws-line"><span className="ws-line-num">9</span><span className="ws-line-content">{'  '}</span></div>
                  <div className="ws-line"><span className="ws-line-num">10</span><span className="ws-line-content"><span className="ws-kw">resource</span> <span className="ws-str">"aws_apprunner_service"</span> <span className="ws-str">"frontend"</span> {'{'}</span></div>
                  <div className="ws-line"><span className="ws-line-num">11</span><span className="ws-line-content">  <span className="ws-prop">service_name</span> = <span className="ws-str">"foodloop-frontend"</span></span></div>
                  <div className="ws-line"><span className="ws-line-num">12</span><span className="ws-line-content">{'  '}</span></div>
                  <div className="ws-line"><span className="ws-line-num">13</span><span className="ws-line-content">  <span className="ws-prop">source_configuration</span> {'{'}</span></div>
                  <div className="ws-line"><span className="ws-line-num">14</span><span className="ws-line-content">    <span className="ws-prop">auto_deployments_enabled</span> = <span className="ws-kw">true</span></span></div>
                  <div className="ws-line"><span className="ws-line-num">15</span><span className="ws-line-content">  {'}'}</span></div>
                  <div className="ws-line"><span className="ws-line-num">16</span><span className="ws-line-content">{'}'}</span></div>
                </code></pre>
              </div>
            </section>
          </div>

          {/* Right column: AI Assistant */}
          <aside className="ws-assistant-panel">
            <div className="ws-assistant-header">
              <div className="ws-assistant-title-row">
                <div className="ws-assistant-avatar">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <circle cx="12" cy="5" r="2" />
                    <path d="M12 7v4" />
                    <line x1="8" y1="16" x2="8" y2="16" />
                    <line x1="16" y1="16" x2="16" y2="16" />
                  </svg>
                </div>
                <h2 className="ws-assistant-title">CloudPilot Assistant</h2>
              </div>
              <button type="button" className="ws-icon-btn" aria-label="More options">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>
            </div>

            <div className="ws-assistant-body">
              <div className="ws-chat-bubble">Can I reduce cost?</div>

              <div className="ws-insight-card">
                <p className="ws-insight-label">OPTIMIZATION INSIGHT</p>
                <p className="ws-insight-text">
                  Switching your backend from <strong>ECS</strong> to <strong>Railway</strong> could save you{' '}
                  <strong>$18/month</strong> with similar performance for your current traffic.
                </p>
                <button type="button" className="ws-apply-btn">
                  Apply migration path
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
                <button type="button" className="ws-breakdown-link">Show cost breakdown</button>
              </div>
            </div>

            <div className="ws-assistant-input-area">
              <div className="ws-input-row">
                <input
                  type="text"
                  className="ws-chat-input"
                  placeholder="Ask CloudPilot something..."
                  readOnly
                />
                <button type="button" className="ws-send-btn" aria-label="Send message">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
              <div className="ws-quick-actions">
                <button type="button" className="ws-quick-btn">/deploy</button>
                <button type="button" className="ws-quick-btn">/analyze_logs</button>
                <button type="button" className="ws-quick-btn">/cost</button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="ws-action-bar">
        <div className="ws-action-bar-inner">
          <div className="ws-action-left">
            <div className="ws-current-estimate">
              <span className="ws-estimate-label">CURRENT ESTIMATE</span>
              <span className="ws-estimate-value">$42 <span>/ mo</span></span>
            </div>
            <div className="ws-valid-badge">
              <span className="ws-valid-dot" />
              Valid Config
            </div>
          </div>
          <div className="ws-action-right">
            <button type="button" className="ws-btn-ghost">Save Draft</button>
            <button type="button" className="ws-btn-outline">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Regenerate
            </button>
            <button type="button" className="ws-btn-primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
              </svg>
              Deploy to Production
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default WorkspaceEditor;
