import React from 'react';
import { formatConfidence } from '../../services/architecture';
import './BlueprintSummary.css';

function BlueprintSummary({ blueprint, platformsEvaluated }) {
  if (!blueprint) return null;

  return (
    <div className="bp-summary-panel">
      <div className="bp-summary-header">
        <div>
          <span className="bp-agent-badge font-mono">DEPLOYMENT BLUEPRINT</span>
          <h2 className="bp-summary-title">{blueprint.application_type?.replace(/_/g, ' ') || 'Architecture'}</h2>
          <p className="bp-summary-text">{blueprint.overall_summary}</p>
          {platformsEvaluated?.length > 0 && (
            <p className="bp-platforms-evaluated">Platforms evaluated: {platformsEvaluated.join(', ')}</p>
          )}
        </div>
        <div className="bp-confidence-badge">
          <span className="bp-confidence-value">{formatConfidence(blueprint.confidence_score)}</span>
          <span className="bp-confidence-label">CONFIDENCE</span>
        </div>
      </div>

      {blueprint.deployment_sequence?.length > 0 && (
        <div className="bp-sequence-section">
          <h3>Deployment Sequence</h3>
          <ol className="bp-sequence-list">
            {blueprint.deployment_sequence.map((step, idx) => (
              <li key={idx}>
                <strong>{step.service_id}</strong> — {step.action}
                {step.notes && <span className="bp-step-notes"> ({step.notes})</span>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default BlueprintSummary;
