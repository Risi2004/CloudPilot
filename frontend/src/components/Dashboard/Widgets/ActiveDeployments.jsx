import React from 'react';
import awsIcon from '../../../assets/aws.svg';
import k8sIcon from '../../../assets/kubernetes.svg';
import vercelIcon from '../../../assets/vercel.svg';
import './ActiveDeployments.css';

const MOCK_DEPLOYMENTS = [
  {
    id: 'dep-1',
    provider: 'AWS (US-East-1)',
    type: 'Production Stack',
    icon: awsIcon,
    status: 'Active',
    uptime: '99.98%',
    resources: '14 resources',
  },
  {
    id: 'dep-2',
    provider: 'Kubernetes Cluster',
    type: 'Microservices',
    icon: k8sIcon,
    status: 'Degraded',
    uptime: '98.40%',
    resources: '28 pods active',
  },
  {
    id: 'dep-3',
    provider: 'Vercel (Edge)',
    type: 'Frontend Web App',
    icon: vercelIcon,
    status: 'Active',
    uptime: '100%',
    resources: '3 custom domains',
  },
];

function ActiveDeployments() {
  const getStatusClass = (status) => {
    return status.toLowerCase();
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
          onClick={() => console.log('Deploy new infrastructure')}
        >
          + Deploy Stack
        </button>
      </div>

      <div className="deployments-grid">
        {MOCK_DEPLOYMENTS.map((dep) => (
          <div key={dep.id} className="deployment-item">
            <div className="deployment-top">
              <div className="provider-logo-container">
                <img src={dep.icon} alt={dep.provider} className="provider-logo" />
              </div>
              <span className={`deployment-status ${getStatusClass(dep.status)}`}>
                <span className="status-dot"></span>
                {dep.status}
              </span>
            </div>
            
            <div className="deployment-mid">
              <span className="provider-name">{dep.provider}</span>
              <span className="deployment-type">{dep.type}</span>
            </div>

            <div className="deployment-footer">
              <div className="metric-box">
                <span className="metric-label">Uptime</span>
                <span className="metric-value">{dep.uptime}</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">Resources</span>
                <span className="metric-value">{dep.resources}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ActiveDeployments;
