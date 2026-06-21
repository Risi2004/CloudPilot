import React, { useState } from 'react';
import './OptimizationInsight.css';

function OptimizationInsight() {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const handleReview = (e) => {
    e.preventDefault();
    alert('Reviewing Redundancies:\n- AWS Connector: 8 redundant documentation chunks found (duplicate policies).\n- Docker Connector: 6 redundant chunks (duplicate container spec references).\nRebuilding the Vector DB will prune these blocks.');
  };

  const handleDismiss = (e) => {
    e.preventDefault();
    setIsDismissed(true);
  };

  return (
    <div className="neural-insight-box">
      <div className="insight-icon-box">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      </div>

      <div className="insight-content-wrapper">
        <h4 className="insight-card-title">Neural Optimization Insight</h4>
        
        <p className="insight-body-text">
          Our autonomous engine has identified <strong className="highlight">14 redundant documentation chunks</strong> across your AWS and Docker connectors. Rebuilding the vector database now could improve search relevance by <span className="highlight-green">22%</span> and reduce storage usage by <strong className="highlight-white">114 MB</strong>.
        </p>

        <div className="insight-actions">
          <a href="#review" onClick={handleReview} className="action-link-review">
            Review Redundancy
          </a>
          <a href="#dismiss" onClick={handleDismiss} className="action-link-dismiss">
            Dismiss Insight
          </a>
        </div>
      </div>
    </div>
  );
}

export default OptimizationInsight;
