import React from 'react';
import './AlternativeOptions.css';

function AlternativeOptions({ alternatives }) {
  return (
    <div className="alternative-options-card">
      <div className="alternative-header">
        <h3 className="alternative-title">Alternative Cheaper Configurations</h3>
        <p className="alternative-subtitle">Optimize resource allocations to save up to 60% on monthly hosting bills</p>
      </div>

      <div className="alternatives-list">
        {alternatives.map((option, idx) => (
          <div key={idx} className="alternative-item">
            <div className="alternative-icon-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </div>
            
            <div className="alternative-details">
              <div className="alternative-meta-row">
                <h4 className="alternative-name">{option.title}</h4>
                <span className="savings-badge font-mono">SAVE {option.savings}</span>
              </div>
              <p className="alternative-desc">{option.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AlternativeOptions;
