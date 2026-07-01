import React from 'react';
import './FailureAnalysisPanel.css';

function FailureAnalysisPanel({ analysis, onRetry, onAnalyze, isAnalyzing }) {
  if (!analysis) {
    return (
      <section className="deploy-failure-panel">
        <h2 className="deploy-section-title">Deployment Failed</h2>
        <p className="deploy-failure-desc">Analyze the failure with official documentation and local AI reasoning.</p>
        <button type="button" className="deploy-analyze-btn" onClick={onAnalyze} disabled={isAnalyzing}>
          {isAnalyzing ? 'Analyzing…' : 'Analyze Failure'}
        </button>
      </section>
    );
  }

  return (
    <section className="deploy-failure-panel">
      <h2 className="deploy-section-title">Failure Analysis</h2>
      {analysis.root_cause && (
        <div className="deploy-failure-block">
          <h3>Root Cause</h3>
          <p>{analysis.root_cause}</p>
        </div>
      )}
      {analysis.explanation && (
        <div className="deploy-failure-block">
          <h3>Explanation</h3>
          <p className="deploy-failure-explanation">{analysis.explanation}</p>
        </div>
      )}
      {analysis.suggested_fixes?.length > 0 && (
        <div className="deploy-failure-block">
          <h3>Suggested Fixes</h3>
          <ol>
            {analysis.suggested_fixes.map((fix) => <li key={fix}>{fix}</li>)}
          </ol>
        </div>
      )}
      {analysis.retry_recommended && (
        <button type="button" className="deploy-retry-btn" onClick={onRetry}>
          Retry After Fixing Issues
        </button>
      )}
    </section>
  );
}

export default FailureAnalysisPanel;
