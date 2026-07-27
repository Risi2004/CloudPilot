import React, { useState } from 'react';
import './DeploymentPipelineView.css';

const STEP_ICON = {
  pending: '○',
  running: '◐',
  success: '✓',
  failed: '✕',
  skipped: '—',
};

function ManageEnvVarsPanel({ resources, onUpdate }) {
  const [selected, setSelected] = useState(resources[0]?.componentName || '');
  const [rows, setRows] = useState([{ key: '', value: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const updateRow = (idx, patch) => {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const handleSubmit = async () => {
    const cleaned = rows.map((r) => ({ key: r.key.trim(), value: r.value })).filter((r) => r.key);
    if (!cleaned.length) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await onUpdate(selected, cleaned);
      setFeedback({ ok: true, message: 'Update started - watch the new step above for progress.' });
      setRows([{ key: '', value: '' }]);
    } catch (err) {
      setFeedback({ ok: false, message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dpv-envmgr">
      <span className="dpv-envmgr-title">Change Environment Variables</span>
      <p className="dpv-envmgr-desc">Update env vars on a deployed service and redeploy it - no repo changes needed.</p>
      <select className="dpv-envmgr-select" value={selected} onChange={(e) => setSelected(e.target.value)}>
        {resources.map((r) => (
          <option key={r.componentName} value={r.componentName}>{r.componentName}</option>
        ))}
      </select>
      {rows.map((row, idx) => (
        <div key={idx} className="dpv-envmgr-row">
          <input
            className="font-mono"
            placeholder="KEY"
            value={row.key}
            onChange={(e) => updateRow(idx, { key: e.target.value })}
          />
          <input
            className="font-mono"
            placeholder="value"
            value={row.value}
            onChange={(e) => updateRow(idx, { value: e.target.value })}
          />
        </div>
      ))}
      <div className="dpv-envmgr-actions">
        <button type="button" className="dpv-envmgr-add-btn" onClick={() => setRows((r) => [...r, { key: '', value: '' }])}>
          + Add variable
        </button>
        <button type="button" className="dpv-envmgr-submit-btn" disabled={submitting} onClick={handleSubmit}>
          {submitting ? 'Applying...' : 'Update & Redeploy'}
        </button>
      </div>
      {feedback && (
        <div className={feedback.ok ? 'dpv-envmgr-feedback-ok' : 'dpv-envmgr-feedback-error'}>{feedback.message}</div>
      )}
    </div>
  );
}

function DeploymentPipelineView({ deployment, onStop, stopping, onRollback, rollingBack, onUpdateEnvVars }) {
  const [expandedStep, setExpandedStep] = useState(null);

  return (
    <div className="dpv-wrapper">
      <div className="dpv-header">
        <h3 className="dpv-title">Deployment Progress</h3>
        <span className={`dpv-status-pill dpv-status-${deployment.status}`}>{deployment.status.toUpperCase()}</span>
        {deployment.status === 'running' && (
          <button type="button" className="dpv-stop-btn" disabled={stopping} onClick={onStop}>
            {stopping ? 'Stopping...' : 'Stop'}
          </button>
        )}
      </div>

      <div className="dpv-steps">
        {deployment.steps.map((step) => {
          const isExpanded = expandedStep === step.key;
          const hasLogs = step.logs && step.logs.length > 0;
          return (
            <div key={step.key} className={`dpv-step dpv-step-${step.status}`}>
              <div
                className="dpv-step-row"
                onClick={() => hasLogs && setExpandedStep(isExpanded ? null : step.key)}
                style={{ cursor: hasLogs ? 'pointer' : 'default' }}
              >
                <span className="dpv-step-icon">{STEP_ICON[step.status] || '○'}</span>
                <span className="dpv-step-label">{step.label}</span>
                {step.message && <span className="dpv-step-message">{step.message}</span>}
                {hasLogs && <span className="dpv-step-toggle">{isExpanded ? '▲' : '▼'}</span>}
              </div>
              {isExpanded && hasLogs && <pre className="dpv-step-logs">{step.logs.join('\n')}</pre>}
            </div>
          );
        })}
      </div>

      {deployment.status === 'failed' && (
        <div className="dpv-failed-box">
          <p className="dpv-failed-message">{deployment.error || 'The deployment failed.'}</p>
          <button type="button" className="dpv-rollback-btn" disabled={rollingBack} onClick={onRollback}>
            {rollingBack ? 'Rolling back...' : 'Rollback / Delete Created Resources'}
          </button>
        </div>
      )}

      {deployment.status === 'stopped' && (
        <div className="dpv-stopped-box">
          This deployment was stopped and any resources it had created were rolled back.
        </div>
      )}

      {deployment.status === 'succeeded' && (
        <div className="dpv-success-box">
          <h4 className="dpv-success-title">Your app is live</h4>
          <div className="dpv-final-links">
            {deployment.finalLinks.map((link) => (
              <a key={link.label} href={link.url} target="_blank" rel="noreferrer" className="dpv-final-link">
                {link.label}: {link.url}
              </a>
            ))}
          </div>
          <div className="dpv-resources-list">
            {deployment.resources.map((r) => (
              <div key={r.componentName} className="dpv-resource-row">
                <span className="dpv-resource-name">{r.componentName}</span>
                <span className={`dpr-platform-badge dpr-platform-${r.platform}`}>{r.platform}</span>
                {r.dashboardUrl && (
                  <a href={r.dashboardUrl} target="_blank" rel="noreferrer" className="dpv-dashboard-link">Dashboard</a>
                )}
              </div>
            ))}
          </div>
          <ManageEnvVarsPanel resources={deployment.resources} onUpdate={onUpdateEnvVars} />
        </div>
      )}
    </div>
  );
}

export default DeploymentPipelineView;
