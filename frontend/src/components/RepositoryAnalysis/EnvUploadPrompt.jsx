import React, { useState, useEffect } from 'react';
import './EnvUploadPrompt.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsText(file);
  });
}

function EnvUploadPrompt({ repoUrl, envVariables, savedValues, scopeOptions, onComplete }) {
  const [dragActive, setDragActive] = useState(false);
  const [variables, setVariables] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [parsingError, setParsingError] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const supportsScoping = Array.isArray(scopeOptions) && scopeOptions.length > 1;

  useEffect(() => {
    const savedLookup = new Map(
      (savedValues || []).map((v) => [String(v.key || '').toUpperCase(), v])
    );
    const initialVars = envVariables.map((v) => {
      const key = v.split(' ')[0];
      const desc = v.includes('(') ? v.substring(v.indexOf('(')) : '';
      const saved = savedLookup.get(key.toUpperCase());
      return { key, value: saved?.value || '', desc, scope: saved?.scope || null };
    });
    setVariables(initialVars);
    setUploadedFiles([]);
    setParsingError('');
    setSubmitError('');
    setUploadStatus('');
  }, [repoUrl, envVariables, savedValues]);

  const handleKeyChange = (index, newKey) => {
    setVariables((prev) => prev.map((v, idx) => (idx === index ? { ...v, key: newKey } : v)));
  };

  const handleValueChange = (index, newValue) => {
    setVariables((prev) => prev.map((v, idx) => (idx === index ? { ...v, value: newValue } : v)));
  };

  const handleScopeChange = (index, newScope) => {
    setVariables((prev) => prev.map((v, idx) => (idx === index ? { ...v, scope: newScope || null } : v)));
  };

  const handleDeleteVar = (index) => {
    setVariables((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddVar = () => {
    setVariables((prev) => [...prev, { key: 'NEW_VARIABLE', value: '', desc: '(Custom)', scope: null }]);
  };

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    try {
      let totalParsed = 0;
      let totalMatched = 0;

      for (const file of files) {
        const text = await readFileAsText(file);
        const parsedList = parseEnvText(text);
        totalParsed += parsedList.length;

        setVariables((prev) => {
          const updated = prev.map((v) => ({ ...v }));
          parsedList.forEach((item) => {
            const existingIdx = updated.findIndex((v) => v.key.toLowerCase() === item.key.toLowerCase());
            if (existingIdx !== -1) {
              updated[existingIdx].value = item.value;
              totalMatched += 1;
            } else {
              updated.push({ key: item.key, value: item.value, desc: '(Uploaded)', scope: null });
            }
          });
          return updated;
        });
      }

      setUploadedFiles((prev) => [...prev, ...files.map((f) => f.name)]);
      setUploadStatus(`Parsed ${totalParsed} variable${totalParsed === 1 ? '' : 's'} from ${files.length} file${files.length === 1 ? '' : 's'} (${totalMatched} matched existing fields).`);
      setParsingError('');
    } catch (err) {
      setParsingError(err.message || 'Failed to parse one of the uploaded files.');
      setUploadStatus('');
    }
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
    if (e.dataTransfer.files && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length) handleFiles(e.target.files);
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);

    try {
      const appToken = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/analysis/env`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${appToken}`,
        },
        body: JSON.stringify({
          repoUrl,
          variables: variables.map((v) => ({ key: v.key, value: v.value, scope: v.scope || null })),
        }),
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

  const autoFillDemo = () => {
    setVariables((prev) =>
      prev.map((v) => {
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
    <div className="env-prompt-container">
      <div className="env-prompt-card">
        <div className="env-status-banner">
          <span className="env-pulse-dot"></span>
          <span>{variables.length} ENVIRONMENT VARIABLE{variables.length === 1 ? '' : 'S'} DETECTED IN CODE</span>
        </div>

        <h2 className="env-prompt-title">Environment Setup Required</h2>
        <p className="env-prompt-desc">
          We scanned this repository's source code and metadata files (like <code>.env.example</code>) for environment
          variables listed below. Upload your production <code>.env</code> file(s) - you can drop or select more than one
          at once - or fill in the values directly.
        </p>

        <div
          className={`env-drag-area ${dragActive ? 'active' : ''} ${uploadedFiles.length ? 'uploaded' : ''}`}
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
            multiple
          />
          <label htmlFor="env-file-input" className="env-upload-label">
            <svg className="upload-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            {uploadedFiles.length ? (
              <span className="upload-message-main">Uploaded: <strong>{uploadedFiles.join(', ')}</strong></span>
            ) : (
              <span className="upload-message-main">
                Drag & drop your <strong>.env</strong> file(s) here, or <span className="browse-link">browse</span>
              </span>
            )}
            <span className="upload-message-sub">
              {uploadedFiles.length ? 'Drop more files to add to the list below' : 'Select multiple files at once if you have separate frontend/backend .env files'}
            </span>
          </label>
        </div>

        {parsingError && <p className="parsing-error-msg">{parsingError}</p>}
        {uploadStatus && <p className="parsing-success-msg">{uploadStatus}</p>}

        <div className="divider-row">
          <span className="divider-text">ENV FIELDS</span>
          <button type="button" onClick={autoFillDemo} className="auto-fill-btn">⚡ Auto-generate Mock Values</button>
        </div>

        <form onSubmit={handleSubmit} className="env-fields-form">
          <div className="env-fields-grid">
            {variables.map((v, idx) => (
              <div key={idx} className="env-var-row">
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
                    type="text"
                    className="env-var-value-input"
                    placeholder="Enter value"
                    value={v.value || ''}
                    onChange={(e) => handleValueChange(idx, e.target.value)}
                  />
                </div>
                {supportsScoping && (
                  <select
                    className="env-var-scope-select"
                    value={v.scope || ''}
                    onChange={(e) => handleScopeChange(idx, e.target.value)}
                    title="Which service needs this variable?"
                  >
                    <option value="">Shared / Any</option>
                    {scopeOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  className="env-var-delete-btn"
                  onClick={() => handleDeleteVar(idx)}
                  title="Delete variable"
                >
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
