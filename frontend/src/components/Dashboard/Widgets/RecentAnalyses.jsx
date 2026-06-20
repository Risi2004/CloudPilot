import React from 'react';
import './RecentAnalyses.css';

const MOCK_ANALYSES = [
  {
    id: 'analysis-1',
    repoName: 'Risi2004/CloudPilot',
    score: 94,
    status: 'Passed',
    findings: { critical: 0, high: 0, medium: 2, low: 5 },
    date: '2 hours ago',
  },
  {
    id: 'analysis-2',
    repoName: 'facebook/react',
    score: 78,
    status: 'Needs Review',
    findings: { critical: 0, high: 2, medium: 4, low: 8 },
    date: 'Yesterday',
  },
  {
    id: 'analysis-3',
    repoName: 'kubernetes/kubernetes',
    score: 45,
    status: 'Failed',
    findings: { critical: 3, high: 7, medium: 12, low: 18 },
    date: '3 days ago',
  },
];

function RecentAnalyses() {
  const getScoreColorClass = (score) => {
    if (score >= 90) return 'score-green';
    if (score >= 70) return 'score-yellow';
    return 'score-red';
  };

  const getStatusClass = (status) => {
    return status.toLowerCase().replace(' ', '-');
  };

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
          onClick={() => console.log('View all analyses')}
        >
          View All
        </button>
      </div>

      <div className="analyses-list">
        {MOCK_ANALYSES.map((analysis) => {
          const scoreClass = getScoreColorClass(analysis.score);
          const statusClass = getStatusClass(analysis.status);

          return (
            <div key={analysis.id} className="analysis-row">
              <div className="analysis-left">
                <div className={`score-badge ${scoreClass}`}>
                  <span className="score-num">{analysis.score}</span>
                  <span className="score-label">score</span>
                </div>
                <div className="analysis-details">
                  <span className="analysis-repo">{analysis.repoName}</span>
                  <span className="analysis-date">Analyzed {analysis.date}</span>
                </div>
              </div>

              <div className="analysis-right">
                <div className="findings-summary">
                  {analysis.findings.critical > 0 && (
                    <span className="finding-pill critical">{analysis.findings.critical} Critical</span>
                  )}
                  {analysis.findings.high > 0 && (
                    <span className="finding-pill high">{analysis.findings.high} High</span>
                  )}
                  {analysis.findings.medium > 0 && (
                    <span className="finding-pill medium">{analysis.findings.medium} Med</span>
                  )}
                  {analysis.findings.critical === 0 && analysis.findings.high === 0 && (
                    <span className="finding-pill optimal">Optimal Infrastructure</span>
                  )}
                </div>
                <div className="analysis-actions">
                  <button 
                    id={`btn-view-report-${analysis.id}`}
                    className="report-btn"
                    onClick={() => console.log('Viewing report', analysis.id)}
                  >
                    View Report
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default RecentAnalyses;
