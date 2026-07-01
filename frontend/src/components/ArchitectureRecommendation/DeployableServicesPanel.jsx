import React from 'react';
import './DeployableServicesPanel.css';

function DeployableServicesPanel({ services }) {
  if (!services?.length) return null;

  return (
    <div className="deploy-services-panel">
      <h3 className="deploy-services-title">Deployable Services</h3>
      <div className="deploy-services-grid">
        {services.map((svc) => (
          <div key={svc.id} className="deploy-service-card">
            <div className="deploy-service-header">
              <span className="deploy-service-name">{svc.name}</span>
              <span className="deploy-service-platform">{svc.platform}</span>
            </div>
            {svc.runtime_version && (
              <div className="deploy-service-row">
                <span className="deploy-label">Runtime</span>
                <span className="deploy-value">{svc.runtime_version}</span>
              </div>
            )}
            {svc.root_directory && svc.root_directory !== '.' && (
              <div className="deploy-service-row">
                <span className="deploy-label">Root</span>
                <span className="deploy-value font-mono">{svc.root_directory}</span>
              </div>
            )}
            {svc.build_command && (
              <div className="deploy-service-row">
                <span className="deploy-label">Build</span>
                <code className="deploy-code">{svc.build_command}</code>
              </div>
            )}
            {svc.start_command && (
              <div className="deploy-service-row">
                <span className="deploy-label">Start</span>
                <code className="deploy-code">{svc.start_command}</code>
              </div>
            )}
            {svc.health_check_path && (
              <div className="deploy-service-row">
                <span className="deploy-label">Health</span>
                <code className="deploy-code">{svc.health_check_path}</code>
              </div>
            )}
            {svc.environment_variables?.length > 0 && (
              <div className="deploy-service-tags">
                {svc.environment_variables.map((v) => (
                  <span key={v} className="deploy-env-tag">{v}</span>
                ))}
              </div>
            )}
            {svc.required_secrets?.length > 0 && (
              <div className="deploy-service-tags">
                {svc.required_secrets.map((v) => (
                  <span key={v} className="deploy-secret-tag">{v}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default DeployableServicesPanel;
