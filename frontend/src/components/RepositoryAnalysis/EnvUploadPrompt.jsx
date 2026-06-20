import React, { useState, useEffect } from 'react';
import './EnvUploadPrompt.css';

function EnvUploadPrompt({ repoUrl, envVariables, onComplete }) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [variables, setVariables] = useState([]);
  const [parsingError, setParsingError] = useState('');

  // Extract keys from envVariables (e.g. "DATABASE_URL (Postgres link)" -> "DATABASE_URL")
  const envKeys = envVariables.map(v => v.split(' ')[0]);

  useEffect(() => {
    // Initialize state from template prop variables
    const initialVars = envVariables.map(v => {
      const key = v.split(' ')[0];
      const desc = v.includes('(') ? v.substring(v.indexOf('(')) : '';
      return { key, value: '', desc };
    });
    setVariables(initialVars);
    setFileName('');
    setParsingError('');
  }, [repoUrl, envVariables]);

  const handleKeyChange = (index, newKey) => {
    setVariables(prev => {
      const updated = [...prev];
      updated[index].key = newKey;
      return updated;
    });
  };

  const handleValueChange = (index, newValue) => {
    setVariables(prev => {
      const updated = [...prev];
      updated[index].value = newValue;
      return updated;
    });
  };

  const handleDeleteVar = (index) => {
    setVariables(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAddVar = () => {
    setVariables(prev => [...prev, { key: 'NEW_VARIABLE', value: '', desc: '(Custom)' }]);
  };

  const parseEnvContent = (text) => {
    try {
      const lines = text.split('\n');
      const parsedVars = [...variables];
      let matchCount = 0;

      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const parts = trimmed.split('=');
          if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, ''); // strip quotes
            
            // Check if this key already exists in our list
            const existingIdx = parsedVars.findIndex(v => v.key.toLowerCase() === key.toLowerCase());
            if (existingIdx !== -1) {
              parsedVars[existingIdx].value = val;
            } else {
              // It is a new custom key from the file! Add it!
              parsedVars.push({ key, value: val, desc: '(Uploaded)' });
            }
            matchCount++;
          }
        }
      });

      setVariables(parsedVars);
      setParsingError('');
      return matchCount;
    } catch (err) {
      setParsingError('Failed to parse .env file format.');
      return 0;
    }
  };

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const count = parseEnvContent(text);
      console.log(`Parsed ${count} variables from uploaded file`);
    };
    reader.readAsText(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
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
    console.log('Environment configured successfully:', variables);
    onComplete();
  };

  const autoFillDemo = () => {
    setVariables(prev => 
      prev.map(v => {
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
        {/* Status indicator */}
        <div className="env-status-banner">
          <span className="env-pulse-dot"></span>
          <span>CONFIGURATION DETECTED: .env.example</span>
        </div>

        <h2 className="env-prompt-title">Environment Setup Required</h2>
        <p className="env-prompt-desc">
          We detected an <code>.env.example</code> file in the repository. Please upload your production <code>.env</code> file or fill in the required parameters below to configure cloud services and telemetry connections.
        </p>

        {/* Drag and Drop File Upload Area */}
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            {fileName ? (
              <span className="upload-message-main">Uploaded: <strong>{fileName}</strong></span>
            ) : (
              <span className="upload-message-main">Drag & drop your <strong>.env</strong> file here, or <span className="browse-link">browse</span></span>
            )}
            <span className="upload-message-sub">Config values will be auto-parsed into fields below</span>
          </label>
        </div>

        {parsingError && <p className="parsing-error-msg">{parsingError}</p>}

        <div className="divider-row">
          <span className="divider-text">ENV FIELDS</span>
          <button type="button" onClick={autoFillDemo} className="auto-fill-btn">⚡ Auto-generate Mock Values</button>
        </div>

        {/* Input fields form */}
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
                    placeholder={`Enter value`}
                    value={v.value || ''}
                    onChange={(e) => handleValueChange(idx, e.target.value)}
                  />
                </div>
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
            <button
              type="button"
              className="env-add-var-btn"
              onClick={handleAddVar}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Custom Variable
            </button>
          </div>

          <button type="submit" className="env-submit-btn">
            Inject Environment & Run Telemetry Analysis →
          </button>
        </form>
      </div>
    </div>
  );
}

export default EnvUploadPrompt;
