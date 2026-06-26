import React from 'react';
import { displayNarrativeText, formatFrameworks, formatLanguages } from '../../services/repositoryAnalysis';

function AnalysisSummary({ result }) {
  const { facts, analysis, source } = result;
  const language = formatLanguages(facts);
  const framework = formatFrameworks(facts);
  const runtime = facts.runtime?.primary || 'Not detected';
  const packageManager = facts.packageManager?.primary || 'Not detected';
  const healthIssues = facts.health?.issues?.length || 0;
  const deploymentPlatforms =
    (facts.deployment?.detected_platforms || []).join(', ') || 'None detected';
  const readiness = displayNarrativeText(analysis?.deployment_readiness) || '—';
  const architecture =
    facts.architecture?.primary ||
    (facts.architecture?.types || []).join(', ') ||
    'Not classified';

  return (
    <div className="analysis-summary-grid">
      <div className="summary-card">
        <div className="summary-card-header">
          <span className="summary-card-icon language">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16.5 9.4 7.55 4.24a1.79 1.79 0 0 0-2.5 1.55v12.42a1.79 1.79 0 0 0 2.5 1.55l8.95-5.16a1.79 1.79 0 0 0 0-3.1automator"></path>
            </svg>
          </span>
          <span className="summary-card-label">PRIMARY LANGUAGE</span>
        </div>
        <div className="summary-card-value" title={language}>{language}</div>
        <div className="summary-card-badge positive">{facts.repository?.file_count || 0} files scanned</div>
      </div>

      <div className="summary-card">
        <div className="summary-card-header">
          <span className="summary-card-icon framework">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
            </svg>
          </span>
          <span className="summary-card-label">FRAMEWORKS</span>
        </div>
        <div className="summary-card-value" title={framework}>{framework}</div>
        <div className="summary-card-badge info">{architecture}</div>
      </div>

      <div className="summary-card">
        <div className="summary-card-header">
          <span className="summary-card-icon payments">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 6v6l4 2"></path>
            </svg>
          </span>
          <span className="summary-card-label">RUNTIME</span>
        </div>
        <div className="summary-card-value">{runtime}</div>
        <div className="summary-card-badge info">{packageManager}</div>
      </div>

      <div className="summary-card">
        <div className="summary-card-header">
          <span className="summary-card-icon cost">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </span>
          <span className="summary-card-label">DEPLOYMENT READINESS</span>
        </div>
        <div className="summary-card-value analysis-summary-truncate" title={readiness}>{readiness}</div>
        <div className="summary-card-badge warning">{deploymentPlatforms}</div>
      </div>

      <div className="summary-card">
        <div className="summary-card-header">
          <span className="summary-card-icon container">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          </span>
          <span className="summary-card-label">CLONE METHOD</span>
        </div>
        <div className="summary-card-value">{source?.clone_method || source?.kind || '—'}</div>
        <div className="summary-card-badge positive">{source?.default_branch || 'main'}</div>
      </div>

      <div className="summary-card">
        <div className="summary-card-header">
          <span className="summary-card-icon security">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </span>
          <span className="summary-card-label">HEALTH CHECKS</span>
        </div>
        <div className="summary-card-value">{healthIssues === 0 ? 'No issues' : `${healthIssues} issue(s)`}</div>
        <div className={`summary-card-badge ${healthIssues === 0 ? 'positive' : 'warning'}`}>
          {facts.health?.has_dockerfile ? 'Dockerfile found' : 'No Dockerfile'}
        </div>
      </div>
    </div>
  );
}

export default AnalysisSummary;
