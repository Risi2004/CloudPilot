import React from 'react';
import './TroubleshootingDiagnosisView.css';

const CATEGORY_LABEL = {
  env: 'Environment Variable',
  code: 'Source Code',
  infra: 'Infrastructure',
  unknown: 'Unknown',
};

function TroubleshootingDiagnosisView({ troubleshooting, showChoiceButtons, onAutoFix, onManual, generatingFix, resolvingManual }) {
  const { diagnosis, status } = troubleshooting;
  if (!diagnosis) return null;

  const autoFixable = diagnosis.category === 'env' || diagnosis.category === 'code';

  return (
    <div className="tdv-wrapper">
      <div className="tdv-header">
        <h3 className="tdv-title">Failure Diagnosis</h3>
        <span className={`tdv-status-pill tdv-status-${status}`}>{status.replace(/_/g, ' ').toUpperCase()}</span>
        <span className={`tdv-category-badge tdv-category-${diagnosis.category}`}>{CATEGORY_LABEL[diagnosis.category]}</span>
        <span className="tdv-confidence">Confidence: {Math.round((diagnosis.confidence || 0) * 100)}%</span>
      </div>

      {diagnosis.errorSignature && <div className="tdv-signature">Signature: {diagnosis.errorSignature}</div>}

      <div className="tdv-root-cause">
        <span className="tdv-label">Root cause</span>
        <p>{diagnosis.rootCause}</p>
      </div>

      {diagnosis.explanation && (
        <div className="tdv-explanation">
          <span className="tdv-label">Explanation</span>
          <p>{diagnosis.explanation}</p>
        </div>
      )}

      {diagnosis.category === 'env' && diagnosis.envFixes && diagnosis.envFixes.length > 0 && (
        <div className="tdv-fixes-list">
          <span className="tdv-label">Proposed environment variable fix(es)</span>
          {diagnosis.envFixes.map((fix, idx) => (
            <div key={idx} className="tdv-fix-row">
              <span className="font-mono">{fix.componentName}.{fix.key} = {fix.newValue}</span>
              <span className="tdv-fix-reason">{fix.reason}</span>
            </div>
          ))}
        </div>
      )}

      {diagnosis.category === 'code' && diagnosis.codeFix && diagnosis.codeFix.files.length > 0 && (
        <div className="tdv-fixes-list">
          <span className="tdv-label">File(s) likely needing a fix</span>
          {diagnosis.codeFix.files.map((f, idx) => (
            <div key={idx} className="tdv-fix-row">
              <span className="font-mono">{f.path}</span>
            </div>
          ))}
        </div>
      )}

      {diagnosis.kbMatches && diagnosis.kbMatches.length > 0 && (
        <div className="tdv-kb-matches">
          <span className="tdv-label">Related known issues</span>
          {diagnosis.kbMatches.map((m, idx) => (
            <div key={idx} className="tdv-kb-match">
              <span className="tdv-kb-label">{m.label}</span>
            </div>
          ))}
        </div>
      )}

      {showChoiceButtons && (
        <div className="tdv-choice-row">
          <button
            type="button"
            className="tdv-auto-fix-btn"
            disabled={!autoFixable || generatingFix}
            onClick={onAutoFix}
            title={!autoFixable ? 'This category of failure cannot be fixed automatically.' : undefined}
          >
            {generatingFix ? 'Preparing fix...' : 'Auto-Fix'}
          </button>
          <button type="button" className="tdv-manual-btn" disabled={resolvingManual} onClick={onManual}>
            {resolvingManual ? 'Saving...' : "I'll Fix It Manually"}
          </button>
        </div>
      )}

      {showChoiceButtons && !autoFixable && (
        <p className="tdv-not-autofixable-note">
          This failure is categorized as "{CATEGORY_LABEL[diagnosis.category]}" and cannot be fixed automatically by CloudPilot.
        </p>
      )}
    </div>
  );
}

export default TroubleshootingDiagnosisView;
