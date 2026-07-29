import React from 'react';
import './DeploymentPlanReview.css';

const PLANS = ['free', 'starter', 'standard', 'pro'];
const REGIONS = ['oregon', 'virginia', 'ohio', 'frankfurt', 'singapore'];

function DeploymentPlanReview({ plan, onChange, onStart, starting, error }) {
  const deployableNames = plan.components.filter((c) => c.deployable).map((c) => c.name);

  const updateComponent = (index, patch) => {
    onChange({
      ...plan,
      components: plan.components.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    });
  };

  const updateEnvVar = (compIndex, varIndex, patch) => {
    onChange({
      ...plan,
      components: plan.components.map((c, i) => {
        if (i !== compIndex) return c;
        return { ...c, envVars: c.envVars.map((v, vi) => (vi === varIndex ? { ...v, ...patch } : v)) };
      }),
    });
  };

  const addEnvVar = (compIndex) => {
    const key = prompt('Enter environment variable name:');
    if (!key) return;
    const normalizedKey = key.trim().toUpperCase();
    if (!normalizedKey) return;

    const comp = plan.components[compIndex];
    if (comp.envVars.some((v) => v.key.toUpperCase() === normalizedKey)) {
      alert('Variable already exists!');
      return;
    }

    const newVar = {
      key: normalizedKey,
      value: '',
      included: true,
      linksToComponent: null,
    };

    updateComponent(compIndex, {
      envVars: [...comp.envVars, newVar],
    });
  };

  const deleteEnvVar = (compIndex, varIndex) => {
    const comp = plan.components[compIndex];
    const newEnvVars = comp.envVars.filter((_, i) => i !== varIndex);
    updateComponent(compIndex, { envVars: newEnvVars });
  };

  const deployableCount = deployableNames.length;

  return (
    <div className="dpr-wrapper">
      <div className="dpr-header">
        <h3 className="dpr-title">Review Deployment Plan</h3>
        <p className="dpr-subtitle">
          This is exactly what CloudPilot will create on your connected platforms. Review and adjust anything before
          starting - this is the last step before real, billable resources are created.
        </p>
      </div>

      {plan.components.map((component, idx) => (
        <div key={component.name} className={`dpr-component-card ${!component.deployable ? 'informational' : ''}`}>
          <div className="dpr-component-header">
            <span className="dpr-component-name">{component.name}</span>
            <span className={`dpr-platform-badge dpr-platform-${component.platform}`}>{component.platform}</span>
            {!component.deployable && <span className="dpr-manual-badge">CONFIGURE MANUALLY</span>}
          </div>

          {!component.deployable ? (
            <p className="dpr-manual-note">
              {component.service || 'Managed datastore'} - provision this yourself in your {component.platform} dashboard
              (or use an external managed service). CloudPilot's Deployment Agent automates web/static services only, not
              managed databases.
            </p>
          ) : (
            <>
              <div className="dpr-fields-grid">
                <label className="dpr-field">
                  <span>Root Directory</span>
                  <input
                    value={component.rootDir}
                    placeholder="(repo root)"
                    onChange={(e) => updateComponent(idx, { rootDir: e.target.value })}
                  />
                </label>
                <label className="dpr-field">
                  <span>Build Command</span>
                  <input value={component.buildCommand} onChange={(e) => updateComponent(idx, { buildCommand: e.target.value })} />
                </label>
                {component.platform === 'render' && (
                  <label className="dpr-field">
                    <span>Start Command</span>
                    <input value={component.startCommand} onChange={(e) => updateComponent(idx, { startCommand: e.target.value })} />
                  </label>
                )}
                {component.platform === 'render' && (
                  <label className="dpr-field">
                    <span>Plan</span>
                    <select value={component.plan} onChange={(e) => updateComponent(idx, { plan: e.target.value })}>
                      {PLANS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </label>
                )}
                {component.platform === 'render' && (
                  <label className="dpr-field">
                    <span>Region</span>
                    <select value={component.region} onChange={(e) => updateComponent(idx, { region: e.target.value })}>
                      {REGIONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <div className="dpr-envvars">
                <div className="dpr-envvars-header">
                  <span className="dpr-envvars-title">Environment Variables</span>
                  <button
                    type="button"
                    className="dpr-add-var-btn"
                    onClick={() => addEnvVar(idx)}
                    title="Add new environment variable"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px' }}>
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add Var
                  </button>
                </div>
                {component.envVars.map((v, vi) => {
                  if (v.included === false) return null;
                  return (
                    <div key={v.key} className="dpr-envvar-row">
                      <span className="dpr-envvar-key font-mono">{v.key}</span>
                      {deployableCount > 1 ? (
                        <select
                          className="dpr-link-select"
                          value={v.linksToComponent || ''}
                          onChange={(e) => updateEnvVar(idx, vi, { linksToComponent: e.target.value || null })}
                        >
                          <option value="">Static value</option>
                          {deployableNames
                            .filter((n) => n !== component.name)
                            .map((n) => (
                              <option key={n} value={n}>Link to {n}'s live URL</option>
                            ))}
                        </select>
                      ) : (
                        <span className="dpr-link-select-placeholder" />
                      )}
                      {!v.linksToComponent && (
                        <input
                          className="dpr-envvar-value font-mono"
                          value={v.value}
                          onChange={(e) => updateEnvVar(idx, vi, { value: e.target.value })}
                        />
                      )}
                      {v.linksToComponent && (
                        <span className="dpr-envvar-linked-note">resolved after {v.linksToComponent} deploys</span>
                      )}
                      <button
                        type="button"
                        className="dpr-envvar-delete-btn"
                        onClick={() => deleteEnvVar(idx, vi)}
                        title="Delete variable"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ))}

      {error && <div className="dpr-error-banner">{error}</div>}

      <button type="button" className="dpr-start-btn" disabled={starting} onClick={onStart}>
        {starting ? 'Starting...' : 'Start Deployment'}
      </button>
    </div>
  );
}

export default DeploymentPlanReview;
