import React from 'react';
import './DeploymentInputsForm.css';

function DeploymentInputsForm({
  missingInputs,
  branch,
  onBranchChange,
  credentials,
  onCredentialChange,
  envVars,
  onEnvVarChange,
  saveCredentials,
  onSaveCredentialsChange,
  onSubmit,
  isSubmitting,
}) {
  const credentialInputs = (missingInputs || []).filter((item) => item.kind === 'credential');
  const envInputs = (missingInputs || []).filter((item) => item.kind === 'env_var');
  const needsBranch = (missingInputs || []).some((item) => item.kind === 'branch');

  return (
    <section className="deploy-inputs-form">
      <h2 className="deploy-section-title">Required Information</h2>
      <p className="deploy-inputs-desc">Provide the missing details before deployment can proceed.</p>

      {needsBranch && (
        <label className="deploy-field">
          <span>Deployment Branch</span>
          <input
            type="text"
            value={branch}
            onChange={(e) => onBranchChange(e.target.value)}
            placeholder="main"
          />
        </label>
      )}

      {credentialInputs.map((item) => (
        <label key={item.name} className="deploy-field">
          <span>{item.description || item.name}</span>
          <input
            type="password"
            value={credentials[item.name] || ''}
            onChange={(e) => onCredentialChange(item.name, e.target.value)}
            placeholder={`Enter ${item.platform || item.name}`}
            autoComplete="off"
          />
        </label>
      ))}

      {envInputs.map((item) => (
        <label key={item.name} className="deploy-field">
          <span>{item.description || item.name}</span>
          <input
            type="password"
            value={envVars[item.name] || ''}
            onChange={(e) => onEnvVarChange(item.name, e.target.value)}
            placeholder={item.name}
            autoComplete="off"
          />
        </label>
      ))}

      {credentialInputs.length > 0 && (
        <label className="deploy-checkbox">
          <input
            type="checkbox"
            checked={saveCredentials}
            onChange={(e) => onSaveCredentialsChange(e.target.checked)}
          />
          Save platform credentials for future deployments (encrypted)
        </label>
      )}

      <button
        type="button"
        className="deploy-submit-btn"
        onClick={onSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Validating…' : 'Continue'}
      </button>
    </section>
  );
}

export default DeploymentInputsForm;
