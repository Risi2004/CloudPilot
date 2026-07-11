import React, { useState, useEffect, useMemo } from 'react';
import './EnvUploadPrompt.css';

function isLikelyAuto(name) {
  const upper = name.toUpperCase();
  if (['PORT', 'NODE_ENV', 'VERCEL_URL', 'RENDER_EXTERNAL_URL'].includes(upper)) return true;
  if (/^(FRONTEND|CLIENT|APP|SITE|WEB|API|BACKEND|SERVER|PUBLIC|BASE)_URL$/.test(upper)) return true;
  if (/^(VITE_|NEXT_PUBLIC_|REACT_APP_|NUXT_PUBLIC_|PUBLIC_|EXPO_PUBLIC_)/.test(upper)) return true;
  if (upper.endsWith('_URL') || upper.endsWith('_ORIGIN')) return true;
  return false;
}

function buildClassifications(environment = {}) {
  if (environment.classifications?.length) {
    return environment.classifications;
  }
  return (environment.variables || []).map((name) => ({
    name,
    source: isLikelyAuto(name) ? 'auto' : 'user',
    reason: isLikelyAuto(name)
      ? 'Set automatically during deployment.'
      : 'Required application configuration.',
    auto_value_hint: isLikelyAuto(name) ? 'Set after deployment goes live' : '',
  }));
}

function EnvUploadPrompt({ repoUrl, environment, onComplete }) {
  const classifications = useMemo(() => buildClassifications(environment), [environment]);

  const userVars = useMemo(
    () => classifications.filter((item) => item.source === 'user'),
    [classifications],
  );
  const autoVars = useMemo(
    () => classifications.filter((item) => item.source === 'auto'),
    [classifications],
  );
  const optionalVars = useMemo(
    () => classifications.filter((item) => item.source === 'optional'),
    [classifications],
  );

  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [variables, setVariables] = useState([]);
  const [parsingError, setParsingError] = useState('');

  useEffect(() => {
    const initialVars = userVars.map((item) => ({
      key: item.name,
      value: '',
      desc: item.reason,
    }));
    setVariables(initialVars);
    setFileName('');
    setParsingError('');
  }, [repoUrl, userVars]);

  const handleKeyChange = (index, newKey) => {
    setVariables((prev) => {
      const updated = [...prev];
      updated[index].key = newKey;
      return updated;
    });
  };

  const handleValueChange = (index, newValue) => {
    setVariables((prev) => {
      const updated = [...prev];
      updated[index].value = newValue;
      return updated;
    });
  };

  const handleDeleteVar = (index) => {
    setVariables((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddVar = () => {
    setVariables((prev) => [...prev, { key: 'NEW_VARIABLE', value: '', desc: 'Custom variable' }]);
  };

  const parseEnvContent = (text) => {
    try {
      const lines = text.split('\n');
      const parsedVars = [...variables];
      let matchCount = 0;

      lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIndex = trimmed.indexOf('=');
          if (eqIndex > 0) {
            const key = trimmed.slice(0, eqIndex).trim().replace(/^export\s+/i, '');
            const val = trimmed.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, '');

            if (isLikelyAuto(key)) {
              return;
            }

            const existingIdx = parsedVars.findIndex((v) => v.key.toLowerCase() === key.toLowerCase());
            if (existingIdx !== -1) {
              parsedVars[existingIdx].value = val;
            } else {
              parsedVars.push({ key, value: val, desc: 'Uploaded from file' });
            }
            matchCount += 1;
          }
        }
      });

      setVariables(parsedVars);
      setParsingError('');
      return matchCount;
    } catch {
      setParsingError('Failed to parse .env file format.');
      return 0;
    }
  };

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      parseEnvContent(e.target.result);
    };
    reader.readAsText(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const envObj = {};
    variables.forEach((v) => {
      if (v.key && v.value?.trim()) {
        envObj[v.key] = v.value.trim();
      }
    });
    onComplete(envObj);
  };

  const handleSkipOptional = () => {
    onComplete({});
  };

  return (
    <div className="env-prompt-container">
      <div className="env-prompt-card">
        <div className="env-status-banner">
          <span className="env-pulse-dot" />
          <span>CONFIGURATION DETECTED: .env.example</span>
        </div>

        <h2 className="env-prompt-title">Environment Setup</h2>
        <p className="env-prompt-desc">
          CloudPilot analyzed your <code>.env.example</code> and split variables into what you must provide
          versus what will be set automatically during deployment.
        </p>

        {autoVars.length > 0 && (
          <section className="env-auto-section">
            <h3 className="env-section-heading">
              <span className="env-badge-auto">Auto</span>
              Set by CloudPilot during deployment
            </h3>
            <ul className="env-auto-list">
              {autoVars.map((item) => (
                <li key={item.name} className="env-auto-item">
                  <code className="env-auto-name">{item.name}</code>
                  <span className="env-auto-reason">{item.reason}</span>
                  {item.auto_value_hint && (
                    <span className="env-auto-hint">{item.auto_value_hint}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {optionalVars.length > 0 && (
          <section className="env-optional-section">
            <h3 className="env-section-heading">
              <span className="env-badge-optional">Optional</span>
              Not required for initial deploy
            </h3>
            <div className="env-optional-chips">
              {optionalVars.map((item) => (
                <span key={item.name} className="env-optional-chip" title={item.reason}>
                  {item.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {userVars.length > 0 && (
          <>
            <section className="env-user-section">
              <h3 className="env-section-heading">
                <span className="env-badge-user">Your input</span>
                Secrets and external services
              </h3>
              <p className="env-user-desc">
                Upload your production <code>.env</code> or fill in only the values below. URL variables like
                <code> FRONTEND_URL</code> are handled automatically — do not enter them here.
              </p>
            </section>

            <div
              className={`env-drag-area ${dragActive ? 'active' : ''} ${fileName ? 'uploaded' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="env-file-input"
                className="env-hidden-file-input"
                onChange={handleFileInput}
                accept=".env,.env.example,.txt"
              />
              <label htmlFor="env-file-input" className="env-upload-label">
                <svg className="upload-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {fileName ? (
                  <span className="upload-message-main">Uploaded: <strong>{fileName}</strong></span>
                ) : (
                  <span className="upload-message-main">
                    Drag & drop your <strong>.env</strong> file here, or <span className="browse-link">browse</span>
                  </span>
                )}
                <span className="upload-message-sub">Only user-required values are imported from the file</span>
              </label>
            </div>

            {parsingError && <p className="parsing-error-msg">{parsingError}</p>}

            <form onSubmit={handleSubmit} className="env-fields-form">
              <div className="env-fields-grid">
                {variables.map((v, idx) => (
                  <div key={`${v.key}-${idx}`} className="env-var-row">
                    <div className="env-var-key-col">
                      <input
                        type="text"
                        className="env-var-key-input font-mono"
                        value={v.key}
                        onChange={(e) => handleKeyChange(idx, e.target.value)}
                        placeholder="VARIABLE_NAME"
                        required
                      />
                      {v.desc && <span className="env-var-desc-badge">{v.desc}</span>}
                    </div>
                    <div className="env-var-value-col">
                      <input
                        type="password"
                        className="env-var-value-input"
                        placeholder="Enter production value"
                        value={v.value || ''}
                        onChange={(e) => handleValueChange(idx, e.target.value)}
                        required
                      />
                    </div>
                    <button
                      type="button"
                      className="env-var-delete-btn"
                      onClick={() => handleDeleteVar(idx)}
                      title="Delete variable"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              <div className="env-actions-row">
                <button type="button" className="env-add-var-btn" onClick={handleAddVar}>
                  Add Custom Variable
                </button>
              </div>

              <button type="submit" className="env-submit-btn">
                Save Environment Configuration →
              </button>
            </form>
          </>
        )}

        {userVars.length === 0 && (
          <div className="env-actions-row">
            <button type="button" className="env-submit-btn" onClick={handleSkipOptional}>
              Continue — no secrets required →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default EnvUploadPrompt;
