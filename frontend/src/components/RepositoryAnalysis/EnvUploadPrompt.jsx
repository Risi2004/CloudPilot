import React, { useState, useEffect } from 'react';
import './EnvUploadPrompt.css';

function EnvUploadPrompt({ repoUrl, envVariables, onComplete }) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [envValues, setEnvValues] = useState({});
  const [parsingError, setParsingError] = useState('');

  // Extract keys from envVariables (e.g. "DATABASE_URL (Postgres link)" -> "DATABASE_URL")
  const envKeys = envVariables.map(v => v.split(' ')[0]);

  useEffect(() => {
    // Initialize empty values
    const initial = {};
    envKeys.forEach(k => {
      initial[k] = '';
    });
    setEnvValues(initial);
    setFileName('');
    setParsingError('');
  }, [repoUrl]);

  const handleInputChange = (key, value) => {
    setEnvValues(prev => ({ ...prev, [key]: value }));
  };

  const parseEnvContent = (text) => {
    try {
      const lines = text.split('\n');
      const parsed = { ...envValues };
      let matchCount = 0;

      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const parts = trimmed.split('=');
          if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, ''); // strip quotes
            
            // If the key is one we are looking for (case-insensitive check)
            const matchedKey = envKeys.find(k => k.toLowerCase() === key.toLowerCase());
            if (matchedKey) {
              parsed[matchedKey] = val;
              matchCount++;
            }
          }
        }
      });

      setEnvValues(parsed);
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
    // In production, we would save envValues
    console.log('Environment configured successfully:', envValues);
    onComplete();
  };

  const autoFillDemo = () => {
    const dummy = { ...envValues };
    envKeys.forEach(k => {
      if (k.includes('URL')) {
        dummy[k] = 'postgresql://admin:secret_pass@database.cloudpilot.internal:5432/production';
      } else if (k.includes('KEY') || k.includes('SECRET')) {
        dummy[k] = 'sk_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      } else {
        dummy[k] = 'production_env_val_' + Math.random().toString(36).substring(2, 7);
      }
    });
    setEnvValues(dummy);
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
            {envVariables.map((v, idx) => {
              const key = v.split(' ')[0];
              const desc = v.includes('(') ? v.substring(v.indexOf('(')) : '';
              return (
                <div key={idx} className="env-field-group">
                  <div className="env-field-label-row">
                    <label className="env-field-label font-mono">{key}</label>
                    {desc && <span className="env-field-desc">{desc}</span>}
                  </div>
                  <input
                    type="text"
                    className="env-field-input"
                    placeholder={`Enter value for ${key}`}
                    value={envValues[key] || ''}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    required
                  />
                </div>
              );
            })}
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
