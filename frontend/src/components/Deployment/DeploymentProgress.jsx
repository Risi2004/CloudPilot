import React, { useState } from 'react';
import './DeploymentProgress.css';

function DeploymentProgress({ progress }) {
  const [expandedService, setExpandedService] = useState(null);

  if (!progress) return null;

  const services = progress.services || [];

  return (
    <section className="deploy-progress-panel">
      <h2 className="deploy-section-title">Deployment Progress</h2>
      <div className="deploy-progress-header">
        <span className={`deploy-status-badge deploy-status-${progress.overall_status}`}>
          {progress.overall_status}
        </span>
        <span className="deploy-stage-label">Stage: {progress.current_stage}</span>
      </div>

      <div className="deploy-progress-bar">
        <div
          className={`deploy-progress-fill deploy-progress-${progress.overall_status}`}
          style={{
            width: progress.overall_status === 'complete' ? '100%' : progress.overall_status === 'failed' ? '100%' : '60%',
          }}
        />
      </div>

      <div className="deploy-service-cards">
        {services.map((service) => (
          <div key={service.service_id} className="deploy-service-card">
            <div className="deploy-service-card-header">
              <div>
                <strong>{service.name || service.service_id}</strong>
                <span className="deploy-service-platform">{service.platform}</span>
              </div>
              <span className={`deploy-status-badge deploy-status-${service.deploy_status}`}>
                {service.deploy_status}
              </span>
            </div>
            <div className="deploy-service-meta-row">
              <span>Build: {service.build_status}</span>
              <span>Stage: {service.stage}</span>
            </div>
            {service.url && (
              <a href={service.url} target="_blank" rel="noreferrer" className="deploy-service-url">
                {service.url}
              </a>
            )}
            {service.error && (
              <p className="deploy-service-error">{service.error}</p>
            )}
            {service.logs_excerpt && (
              <>
                <button
                  type="button"
                  className="deploy-logs-toggle"
                  onClick={() => setExpandedService(
                    expandedService === service.service_id ? null : service.service_id,
                  )}
                >
                  {expandedService === service.service_id ? 'Hide Logs' : 'Show Logs'}
                </button>
                {expandedService === service.service_id && (
                  <pre className="deploy-logs">{service.logs_excerpt}</pre>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default DeploymentProgress;
