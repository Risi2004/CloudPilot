import React, { useState, useEffect } from 'react';
import './EnvUploadPrompt.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SHARED_SCOPE = '__shared__';

function parseEnvText(text) {
  const lines = text.split(/\r?\n/);
  const parsedList = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      if (parts.length >= 2) {
        let key = parts[0].trim();
        key = key.replace(/^['"]|['"]$/g, '').trim();
        if (key.startsWith('export ')) {
          key = key.replace(/^export\s+/, '').trim();
        }

        let val = parts.slice(1).join('=').trim();
        const hasQuotes = /^(["']).*\1$/.test(val);
        if (!hasQuotes) {
          const hashIdx = val.indexOf('#');
          if (hashIdx !== -1) {
            val = val.substring(0, hashIdx).trim();
          }
        } else {
          val = val.replace(/^['"]|['"]$/g, '');
        }

        parsedList.push({ key, value: val });
      }
    }
  });

  return parsedList;
}

// Groups the flat, repo-wide list of detected variable-name templates and any
// previously-saved values into one section per detected deployable component
// (when the repo has more than one), plus a catch-all "Shared / Other"
// section for anything not assigned to a specific one. For a monolith (0-1
// detected components) this collapses to exactly one section, identical to
// the original single-list behavior.
function buildInitialSections(envVariables, savedValues, scopeOptions) {
  const templates = envVariables.map((v) => {
    const key = v.split(' ')[0];
    const desc = v.includes('(') ? v.substring(v.indexOf('(')) : '';
    return { key, desc };
  });

  const savedByScope = {};
  (savedValues || []).forEach((v) => {
    const scope = v.scope || SHARED_SCOPE;
    if (!savedByScope[scope]) savedByScope[scope] = [];
    savedByScope[scope].push(v);
  });

  if (!scopeOptions || scopeOptions.length < 2) {
    const savedLookup = new Map((savedValues || []).map((v) => [String(v.key || '').toUpperCase(), v.value || '']));
    return [
      {
        name: null,
        variables: templates.map((t) => ({ key: t.key, value: savedLookup.get(t.key.toUpperCase()) || '', desc: t.desc })),
      },
    ];
  }

  const sections = scopeOptions.map((scopeName) => ({
    name: scopeName,
    variables: (savedByScope[scopeName] || []).map((v) => ({ key: v.key, value: v.value, desc: '' })),
  }));

  const assignedKeys = new Set(sections.flatMap((s) => s.variables.map((v) => v.key.toUpperCase())));
  const sharedSaved = savedByScope[SHARED_SCOPE] || [];
  const sharedLookup = new Map(sharedSaved.map((v) => [String(v.key || '').toUpperCase(), v.value || '']));

  const sharedVariables = templates
    .filter((t) => !assignedKeys.has(t.key.toUpperCase()))
    .map((t) => ({ key: t.key, value: sharedLookup.get(t.key.toUpperCase()) || '', desc: t.desc }));

  sharedSaved.forEach((v) => {
    const upperKey = String(v.key).toUpperCase();
    if (!assignedKeys.has(upperKey) && !sharedVariables.some((sv) => sv.key.toUpperCase() === upperKey)) {
      sharedVariables.push({ key: v.key, value: v.value, desc: '' });
    }
  });

  sections.push({ name: null, variables: sharedVariables });
  return sections;
}

function EnvSection({ title, hint, variables, onChange, showAutoFill }) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsingError, setParsingError] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');

  const updateVar = (index, patch) => {
    onChange(variables.map((v, idx) => (idx === index ? { ...v, ...patch } : v)));
  };

  const handleDeleteVar = (index) => {
    onChange(variables.filter((_, idx) => idx !== index));
  };

  const handleAddVar = () => {
    onChange([...variables, { key: 'NEW_VARIABLE', value: '', desc: '(Custom)' }]);
  };

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsedList = parseEnvText(e.target.result);
        let matchCount = 0;
        const updated = variables.map((v) => ({ ...v }));

        parsedList.forEach((item) => {
          const existingIdx = updated.findIndex((v) => v.key.toLowerCase() === item.key.toLowerCase());
          if (existingIdx !== -1) {
            updated[existingIdx].value = item.value;
            matchCount += 1;
          } else {
            updated.push({ key: item.key, value: item.value, desc: '(Uploaded)' });
          }
        });

        onChange(updated);
        setUploadStatus(`Parsed ${parsedList.length} variables from file (${matchCount} matched existing fields).`);
        setParsingError('');
      } catch {
        setParsingError('Failed to parse .env file format.');
        setUploadStatus('');
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const inputId = `env-file-input-${title || 'shared'}`;

  const autoFillDemo = () => {
    onChange(
      variables.map((v) => {
        let value = v.value;
        if (!value) {
          if (v.key.includes('URL')) {
            value = 'postgresql://admin:secret_pass@database.cloudpilot.internal:5432/production';
          } else if (v.key.includes('KEY') || v.key.includes('SECRET')) {
            value = 'sk_live_' + Math.random().toString(36).substring(2, 15);
          } else {
            value = 'production_env_val_' + Math.random().toString(36).substring(2, 7);
          }
        }
        return { ...v, value };
      })
    );
  };

  return (
    <div className="env-section">
      {title && (
        <div className="env-section-header">
          <span className="env-section-title">{title}</span>
          {hint && <span className="env-section-hint">{hint}</span>}
        </div>
      )}

      <div
        className={`env-drag-area ${dragActive ? 'active' : ''} ${fileName ? 'uploaded' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id={inputId}
          className="env-hidden-file-input"
          onChange={(e) => e.target.files && e.target.files[0] && handleFile(e.target.files[0])}
          accept=".env,.env.example,.txt"
        />
        <label htmlFor={inputId} className="env-upload-label">
          <svg className="upload-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          {fileName ? (
            <span className="upload-message-main">Uploaded: <strong>{fileName}</strong></span>
          ) : (
            <span className="upload-message-main">
              Drag & drop {title ? `${title}'s` : 'your'} <strong>.env</strong> file here, or <span className="browse-link">browse</span>
            </span>
          )}
        </label>
      </div>

      {parsingError && <p className="parsing-error-msg">{parsingError}</p>}
      {uploadStatus && <p className="parsing-success-msg">{uploadStatus}</p>}

      <div className="divider-row">
        <span className="divider-text">ENV FIELDS</span>
        {showAutoFill && (
          <button type="button" onClick={autoFillDemo} className="auto-fill-btn">⚡ Auto-generate Mock Values</button>
        )}
      </div>

      <div className="env-fields-grid">
        {variables.map((v, idx) => (
          <div key={idx} className="env-var-row">
            <div className="env-var-key-col">
              <input
                type="text"
                className="env-var-key-input font-mono"
                value={v.key}
                onChange={(e) => updateVar(idx, { key: e.target.value })}
                placeholder="VARIABLE_NAME"
                required
              />
              {v.desc && <span className="env-var-desc-badge">{v.desc}</span>}
            </div>
            <div className="env-var-value-col">
              <input
                type="text"
                className="env-var-value-input"
                placeholder="Enter value"
                value={v.value || ''}
                onChange={(e) => updateVar(idx, { value: e.target.value })}
              />
            </div>
            <button type="button" className="env-var-delete-btn" onClick={() => handleDeleteVar(idx)} title="Delete variable">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="env-actions-row">
        <button type="button" className="env-add-var-btn" onClick={handleAddVar}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Custom Variable
        </button>
      </div>
    </div>
  );
}

function EnvUploadPrompt({ repoUrl, envVariables, savedValues, scopeOptions, onComplete }) {
  const [sections, setSections] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    setSections(buildInitialSections(envVariables, savedValues, scopeOptions));
    setSubmitError('');
  }, [repoUrl, envVariables, savedValues, scopeOptions]);

  const updateSectionVariables = (sectionIdx, nextVariables) => {
    setSections((prev) => prev.map((s, i) => (i === sectionIdx ? { ...s, variables: nextVariables } : s)));
  };

  const totalVariableCount = sections.reduce((sum, s) => sum + s.variables.length, 0);
  const isMultiSection = sections.length > 1;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);

    try {
      const allVars = sections.flatMap((s) => s.variables.map((v) => ({ key: v.key, value: v.value, scope: s.name })));
      const appToken = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/analysis/env`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${appToken}`,
        },
        body: JSON.stringify({ repoUrl, variables: allVars }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || 'Failed to save environment variables.');
      }

      onComplete(payload.envVariables);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="env-prompt-container">
      <div className="env-prompt-card">
        <div className="env-status-banner">
          <span className="env-pulse-dot"></span>
          <span>{totalVariableCount} ENVIRONMENT VARIABLE{totalVariableCount === 1 ? '' : 'S'} DETECTED IN CODE</span>
        </div>

        <h2 className="env-prompt-title">Environment Setup Required</h2>
        <p className="env-prompt-desc">
          We scanned this repository's source code and metadata files (like <code>.env.example</code>) for environment
          variables.{' '}
          {isMultiSection
            ? 'This repo has multiple deployable services - upload or fill in a separate .env for each one below, so CloudPilot sends the right variables to the right service.'
            : 'Please upload your production .env file or fill in the values below.'}
        </p>

        <form onSubmit={handleSubmit} className="env-fields-form">
          {sections.map((section, idx) => (
            <EnvSection
              key={section.name || 'shared'}
              title={isMultiSection ? section.name || 'Shared / Other' : null}
              hint={isMultiSection && !section.name ? 'Variables not assigned to a specific service above' : null}
              variables={section.variables}
              onChange={(next) => updateSectionVariables(idx, next)}
              showAutoFill={!isMultiSection || idx === sections.length - 1}
            />
          ))}

          {submitError && <p className="parsing-error-msg">{submitError}</p>}

          <button type="submit" className="env-submit-btn" disabled={submitting}>
            {submitting ? 'Saving...' : 'Inject Environment & Run Telemetry Analysis →'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default EnvUploadPrompt;
