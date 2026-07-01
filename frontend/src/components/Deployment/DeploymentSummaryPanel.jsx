import React from 'react';
import './DeploymentSummaryPanel.css';

function DeploymentSummaryPanel({ summary, onConfirm, isSubmitting }) {
  if (!summary) return null;

  return (
    <section className="deploy-summary-panel">
      <h2 className="deploy-section-title">Deployment Summary</h2>
      <p className="deploy-summary-desc">Review the plan below. Deployment will not start until you confirm.</p>

      <div className="deploy-summary-grid">
        <div className="deploy-summary-item">
          <span className="deploy-summary-label">Repository</span>
          <span className="deploy-summary-value">{summary.repository}</span>
        </div>
        <div className="deploy-summary-item">
          <span className="deploy-summary-label">Branch</span>
          <span className="deploy-summary-value">{summary.branch}</span>
        </div>
        <div className="deploy-summary-item">
          <span className="deploy-summary-label">Platforms</span>
          <span className="deploy-summary-value">{summary.platforms?.join(', ') || '—'}</span>
        </div>
        <div className="deploy-summary-item">
          <span className="deploy-summary-label">Complexity</span>
          <span className={`deploy-complexity deploy-complexity-${summary.complexity}`}>
            {summary.complexity}
          </span>
        </div>
        <div className="deploy-summary-item">
          <span className="deploy-summary-label">Estimated Time</span>
          <span className="deploy-summary-value">~{summary.estimated_duration_minutes} min</span>
        </div>
      </div>

      <div className="deploy-summary-section">
        <h3>Services</h3>
        <ul className="deploy-service-list">
          {(summary.services || []).map((service) => (
            <li key={service.service_id} className="deploy-service-item">
              <strong>{service.name}</strong>
              <span className="deploy-service-meta">{service.platform}</span>
              {service.build_command && (
                <code className="deploy-command">{service.build_command}</code>
              )}
            </li>
          ))}
        </ul>
      </div>

      {summary.deployment_order?.length > 0 && (
        <div className="deploy-summary-section">
          <h3>Deployment Order</h3>
          <ol className="deploy-order-list">
            {summary.deployment_order.map((serviceId) => (
              <li key={serviceId}>{serviceId}</li>
            ))}
          </ol>
        </div>
      )}

      {summary.environment_variables?.length > 0 && (
        <div className="deploy-summary-section">
          <h3>Environment Variables</h3>
          <div className="deploy-env-tags">
            {summary.environment_variables.map((name) => (
              <span key={name} className="deploy-env-tag">{name}</span>
            ))}
          </div>
        </div>
      )}

      {summary.potential_risks?.length > 0 && (
        <div className="deploy-summary-section deploy-risks">
          <h3>Potential Risks</h3>
          <ul>
            {summary.potential_risks.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        className="deploy-confirm-btn"
        onClick={onConfirm}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Starting Deployment…' : 'Deploy Now — I Confirm'}
      </button>
    </section>
  );
}

export default DeploymentSummaryPanel;
