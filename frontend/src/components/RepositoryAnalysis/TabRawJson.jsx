import React, { useState } from 'react';

function TabRawJson({ result }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(result, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="tab-pane-content">
      <div className="tab-pane-header raw-json-header">
        <div>
          <h3 className="tab-pane-title">Full Analysis JSON</h3>
          <p className="tab-pane-subtitle">Complete `RepositoryAnalysisResult` payload (`facts`, `analysis`, `source`).</p>
        </div>
        <button type="button" className="raw-json-copy-btn" onClick={handleCopy}>
          {copied ? 'Copied' : 'Copy JSON'}
        </button>
      </div>
      <pre className="raw-json-viewer">{json}</pre>
    </div>
  );
}

export default TabRawJson;
