import React from 'react';
import { displayNarrativeText } from '../../services/repositoryAnalysis';

function TabDeploymentHealth({ result }) {
  const { facts, analysis } = result;
  const commands = facts.commands || {};
  const env = facts.environment || {};
  const deployment = facts.deployment || {};
  const cicd = facts.cicd || {};
  const health = facts.health || {};

  return (
    <div className="tab-pane-content">
      <div className="tab-pane-header">
        <h3 className="tab-pane-title">Deployment, CI/CD & Health</h3>
        <p className="tab-pane-subtitle">Commands, environment templates, deployment files, and readiness checks.</p>
      </div>

      <div className="runtime-specs-container">
        <div className="runtime-spec-box">
          <span className="spec-label">INSTALL</span>
          <span className="spec-value font-mono">{commands.install || '—'}</span>
        </div>
        <div className="runtime-spec-box">
          <span className="spec-label">BUILD</span>
          <span className="spec-value font-mono">{commands.build || '—'}</span>
        </div>
        <div className="runtime-spec-box">
          <span className="spec-label">START</span>
          <span className="spec-value font-mono">{commands.start || '—'}</span>
        </div>
        <div className="runtime-spec-box">
          <span className="spec-label">DEV</span>
          <span className="spec-value font-mono">{commands.dev || '—'}</span>
        </div>
      </div>

      <div className="dependencies-section-split">
        <div className="deps-list-wrapper">
          <h4 className="section-sub-title">Environment Variables ({env.variables?.length || 0})</h4>
          <div className="env-vars-list">
            {(env.variables || []).map((key) => (
              <div key={key} className="env-var-card">
                <span className="env-var-key font-mono">{key}</span>
              </div>
            ))}
            {!env.variables?.length && <p className="fact-muted">No template variables detected</p>}
          </div>
          {env.template_files?.length > 0 && (
            <p className="fact-muted" style={{ marginTop: '12px' }}>
              Templates: {env.template_files.join(', ')}
            </p>
          )}
        </div>

        <div className="env-vars-wrapper">
          <h4 className="section-sub-title">Deployment Files</h4>
          <div className="fact-list-stack">
            {(deployment.files || []).map((file) => (
              <div key={file.path} className="fact-list-item">
                <span className="env-var-key font-mono">{file.path}</span>
                <span className="fact-muted"> ({file.type})</span>
              </div>
            ))}
            {!deployment.files?.length && <p className="fact-muted">No deployment files detected</p>}
          </div>
          <h4 className="section-sub-title" style={{ marginTop: '20px' }}>Platforms</h4>
          <div className="fact-tag-list">
            {(deployment.detected_platforms || []).map((p) => (
              <span key={p} className="fact-tag">{p}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="fact-sections-grid" style={{ marginTop: '24px' }}>
        <div className="fact-section-card">
          <h4 className="section-sub-title">CI/CD Systems</h4>
          {(cicd.systems || []).length ? (
            cicd.systems.map((system) => (
              <div key={system.name} className="fact-list-item">
                <strong>{system.name}</strong>
                <div className="fact-muted">{system.evidence_files?.join(', ')}</div>
              </div>
            ))
          ) : (
            <p className="fact-muted">None detected</p>
          )}
        </div>

        <div className="fact-section-card">
          <h4 className="section-sub-title">Health Issues ({health.issues?.length || 0})</h4>
          <div className="health-flags">
            <span className={`fact-tag ${health.has_env_template ? 'positive' : ''}`}>Env template: {health.has_env_template ? 'yes' : 'no'}</span>
            <span className={`fact-tag ${health.has_build_command ? 'positive' : ''}`}>Build cmd: {health.has_build_command ? 'yes' : 'no'}</span>
            <span className={`fact-tag ${health.has_start_command ? 'positive' : ''}`}>Start cmd: {health.has_start_command ? 'yes' : 'no'}</span>
            <span className={`fact-tag ${health.has_dockerfile ? 'positive' : ''}`}>Dockerfile: {health.has_dockerfile ? 'yes' : 'no'}</span>
            <span className={`fact-tag ${health.has_lock_file ? 'positive' : ''}`}>Lock file: {health.has_lock_file ? 'yes' : 'no'}</span>
          </div>
          <ul className="analysis-bullet-list" style={{ marginTop: '16px' }}>
            {(health.issues || []).map((issue) => (
              <li key={issue.code}>
                <strong>{issue.code}</strong>: {issue.message}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="narrative-card" style={{ marginTop: '24px' }}>
        <h4 className="section-sub-title">Recommended Deployment Strategy</h4>
        <p className="narrative-body">
          {displayNarrativeText(analysis?.recommended_deployment_strategy) || '—'}
        </p>
      </div>
    </div>
  );
}

export default TabDeploymentHealth;
