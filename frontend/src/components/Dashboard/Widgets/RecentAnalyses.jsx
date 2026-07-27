import React from 'react';
import './RecentAnalyses.css';

function formatRelativeTime(dateString) {
  try {
    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 0) return 'just now';
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins || 1} min${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } catch {
    return 'recently';
  }
}

function RecentAnalyses({ analyses = [] }) {
  const getScoreColorClass = (score) => {
    if (score >= 90) return 'score-green';
    if (score >= 70) return 'score-yellow';
    return 'score-red';
  };

  const recentList = analyses.slice(0, 3);

  return (
    <section className="widget-card recent-analyses-card">
      <div className="widget-header">
        <div className="widget-header-title">
          <svg className="widget-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          <h3>Recent AI Analyses</h3>
        </div>
        <button 
          id="btn-view-all-analyses"
          className="widget-action-btn"
          onClick={() => window.location.href = '/repositories'}
        >
          View All
        </button>
      </div>

      <div className="analyses-list">
        {recentList.length === 0 ? (
          <div className="empty-widget-state">
            <p>No repository analyses found. Connect a repo to begin scans.</p>
          </div>
        ) : (
          recentList.map((analysis) => {
            const readiness = analysis.deploymentReadiness || {};
            const score = typeof readiness.score === 'number' ? readiness.score : 100;
            const scoreClass = getScoreColorClass(score);
            const checks = Array.isArray(readiness.checks) ? readiness.checks : [];
            const critical = checks.filter((c) => c.status === 'fail').length;
            const warning = checks.filter((c) => c.status === 'warning').length;

            return (
              <div key={analysis._id} className="analysis-row">
                <div className="analysis-left">
                  <div className={`score-badge ${scoreClass}`}>
                    <span className="score-num">{score}</span>
                    <span className="score-label">score</span>
                  </div>
                  <div className="analysis-details">
                    <span className="analysis-repo">{analysis.repoFullName || analysis.repoUrl}</span>
                    <span className="analysis-date">Analyzed {formatRelativeTime(analysis.updatedAt)}</span>
                  </div>
                </div>

                <div className="analysis-right">
                  <div className="findings-summary">
                    {critical > 0 && (
                      <span className="finding-pill critical">{critical} Critical</span>
                    )}
                    {warning > 0 && (
                      <span className="finding-pill medium">{warning} Warning</span>
                    )}
                    {critical === 0 && warning === 0 && (
                      <span className="finding-pill optimal">Optimal Infrastructure</span>
                    )}
                  </div>
                  <div className="analysis-actions">
                    <button 
                      id={`btn-view-report-${analysis._id}`}
                      className="report-btn"
                      onClick={() => window.location.href = `/repositories?url=${encodeURIComponent(analysis.repoUrl)}`}
                    >
                      View Report
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

export default RecentAnalyses;
