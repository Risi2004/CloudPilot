import React from 'react';
import './DeploymentReportPanel.css';

function DeploymentReportPanel({ report }) {
  if (!report) return null;

  return (
    <section className="deploy-report-panel">
      <h2 className="deploy-section-title">Deployment Report</h2>
      <div className={`deploy-report-status deploy-report-${report.status}`}>
        Status: {report.status}
      </div>

      {report.deployment_urls?.length > 0 && (
        <div className="deploy-report-section">
          <h3>Live URLs</h3>
          <ul className="deploy-report-urls">
            {report.deployment_urls.map((url) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noreferrer">{url}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="deploy-report-meta">
        {report.platforms_used?.length > 0 && (
          <span>Platforms: {report.platforms_used.join(', ')}</span>
        )}
        {report.duration_seconds != null && (
          <span>Duration: {Math.round(report.duration_seconds)}s</span>
        )}
      </div>

      {report.build_summary && (
        <p className="deploy-report-summary">{report.build_summary}</p>
      )}

      {report.warnings?.length > 0 && (
        <div className="deploy-report-section">
          <h3>Warnings</h3>
          <ul className="deploy-report-warnings">
            {report.warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </div>
      )}

      {report.recommendations?.length > 0 && (
        <div className="deploy-report-section">
          <h3>Recommendations</h3>
          <ul>
            {report.recommendations.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      )}

      {report.next_steps?.length > 0 && (
        <div className="deploy-report-section">
          <h3>Next Steps</h3>
          <ol>
            {report.next_steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </div>
      )}
    </section>
  );
}

export default DeploymentReportPanel;
