import React from 'react';
import awsIcon from '../../../assets/aws.svg';
import k8sIcon from '../../../assets/kubernetes.svg';
import vercelIcon from '../../../assets/vercel.svg';
import renderIcon from '../../../assets/render.svg';
import './ActiveDeployments.css';

function ActiveDeployments({ deployments = [] }) {
  const getStatusClass = (status) => {
    const s = String(status).toLowerCase();
    if (s === 'succeeded') return 'active';
    if (s === 'running' || s === 'stopping') return 'syncing';
    return 'degraded';
  };

  const getStatusLabel = (status) => {
    const s = String(status).toLowerCase();
    if (s === 'succeeded') return 'Active';
    if (s === 'running') return 'Deploying';
    if (s === 'stopping') return 'Stopping';
    if (s === 'stopped') return 'Stopped';
    return 'Failed';
  };

  return (
    <section className="widget-card active-deployments-card">
      <div className="widget-header">
        <div className="widget-header-title">
          <svg className="widget-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
          <h3>Active Deployments</h3>
        </div>
        <button 
          id="btn-deploy-new-stack"
          className="widget-action-btn"
          onClick={() => window.location.href = '/repositories'}
        >
          + Deploy Stack
        </button>
      </div>

      <div className="deployments-grid">
        {deployments.length === 0 ? (
          <div className="empty-widget-state-full">
            <p>No active deployments found. Design an architecture option and deploy it to get started.</p>
          </div>
        ) : (
          deployments.map((dep) => {
            const hasVercel = dep.resources?.some((r) => r.platform === 'vercel');
            const hasRender = dep.resources?.some((r) => r.platform === 'render');
            let icon = renderIcon;
            let providerLabel = 'Render';

            if (hasVercel && hasRender) {
              icon = vercelIcon; // Or mixed
              providerLabel = 'Vercel + Render';
            } else if (hasVercel) {
              icon = vercelIcon;
              providerLabel = 'Vercel';
            }

            const activeComponentsCount = dep.plan?.components?.filter((c) => c.deployable).length || 0;

            return (
              <div 
                key={dep.id} 
                className="deployment-item" 
                onClick={() => window.location.href = `/deployment-agent?url=${encodeURIComponent(dep.repoUrl)}&optionId=${encodeURIComponent(dep.architectureOptionId)}`}
                style={{ cursor: 'pointer' }}
              >
                <div className="deployment-top">
                  <div className="provider-logo-container">
                    <img src={icon} alt={providerLabel} className="provider-logo" />
                  </div>
                  <span className={`deployment-status ${getStatusClass(dep.status)}`}>
                    <span className="status-dot"></span>
                    {getStatusLabel(dep.status)}
                  </span>
                </div>
                
                <div className="deployment-mid">
                  <span className="provider-name">{dep.repoFullName || dep.repoUrl.split('/').slice(-2).join('/')}</span>
                  <span className="deployment-type">{providerLabel} Infrastructure</span>
                </div>

                <div className="deployment-footer">
                  <div className="metric-box">
                    <span className="metric-label">Uptime</span>
                    <span className="metric-value">99.98%</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">Resources</span>
                    <span className="metric-value">{activeComponentsCount} active services</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

export default ActiveDeployments;
