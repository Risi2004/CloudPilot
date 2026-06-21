import React, { useState } from 'react';
import './CloudHealth.css';

// SVG Assets
import sparklesIcon from '../../../assets/ai-reccomendations.svg';

function CloudHealth() {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isOptimized, setIsOptimized] = useState(false);
  
  // Status states
  const [azureHealth, setAzureHealth] = useState(94.12);
  const [azureStatus, setAzureStatus] = useState('warning'); // normal, warning

  const handleExecuteOptimization = () => {
    if (isOptimized || isOptimizing) return;
    
    setIsOptimizing(true);
    
    // Simulate rerouting optimization
    setTimeout(() => {
      setIsOptimizing(false);
      setIsOptimized(true);
      setAzureHealth(99.95);
      setAzureStatus('normal');
    }, 2000);
  };

  return (
    <div className="cloud-health-card">
      <h3 className="cloud-health-title">Cloud Health</h3>
      
      {/* Metrics list */}
      <div className="health-metrics-list">
        
        {/* AWS */}
        <div className="health-metric-item">
          <div className="health-metric-header">
            <div className="health-metric-name-wrapper">
              <span className="status-dot green" />
              <span className="provider-name">AWS us-east-1</span>
            </div>
            <span className="provider-value">99.98%</span>
          </div>
          <div className="provider-progress-bar">
            <div className="progress-fill green" style={{ width: '99.98%' }} />
          </div>
        </div>

        {/* GCP */}
        <div className="health-metric-item">
          <div className="health-metric-header">
            <div className="health-metric-name-wrapper">
              <span className="status-dot green" />
              <span className="provider-name">GCP europe-west3</span>
            </div>
            <span className="provider-value">100%</span>
          </div>
          <div className="provider-progress-bar">
            <div className="progress-fill green" style={{ width: '100%' }} />
          </div>
        </div>

        {/* Azure */}
        <div className="health-metric-item">
          <div className="health-metric-header">
            <div className="health-metric-name-wrapper">
              <span className={`status-dot ${azureStatus === 'warning' ? 'orange' : 'green'}`} />
              <span className="provider-name">Azure east-asia</span>
            </div>
            <span className="provider-value">{azureHealth}%</span>
          </div>
          <div className="provider-progress-bar">
            <div className={`progress-fill ${azureStatus === 'warning' ? 'orange' : 'green'}`} style={{ width: `${azureHealth}%` }} />
          </div>
        </div>

      </div>

      {/* AI Recommendation Box */}
      <div className={`ai-recommendation-box ${isOptimized ? 'optimized' : ''}`}>
        <div className="rec-box-header">
          <img src={sparklesIcon} alt="Sparkles" className="rec-sparkles-icon" />
          <span className="rec-title">AI Recommendation</span>
        </div>
        
        <p className="rec-content">
          {isOptimizing ? (
            <span className="optimizing-text">
              <svg className="spinner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <circle cx="12" cy="12" r="10" strokeDasharray="40 20" strokeLinecap="round" />
              </svg>
              Rerouting traffic & scaling AWS instances...
            </span>
          ) : isOptimized ? (
            "Azure east-asia rerouted. 20% traffic successfully shifted to AWS us-east-1. Cloud health restored to optimum status."
          ) : (
            "Azure region experiencing high latency. AI Agent 'AutoHeal-01' suggests rerouting 20% of traffic to AWS us-east-1 to prevent downtime."
          )}
        </p>

        {!isOptimized && (
          <button 
            className={`optimize-action-btn ${isOptimizing ? 'loading' : ''}`}
            onClick={handleExecuteOptimization}
            disabled={isOptimizing}
          >
            {isOptimizing ? 'EXECUTING...' : 'EXECUTE OPTIMIZATION'}
            {!isOptimizing && <span className="arrow-icon">→</span>}
          </button>
        )}
        
        {isOptimized && (
          <div className="optimized-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="checkmark-icon">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            OPTIMIZATION COMPLETED
          </div>
        )}
      </div>
    </div>
  );
}

export default CloudHealth;
