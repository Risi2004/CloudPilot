import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AnalysisHeader.css';

// SVG Assets
import analyzeRepositoryIcon from '../../assets/analyze-repository.svg';

function AnalysisHeader({ currentUrl, onAnalyzeNew }) {
  const [newUrl, setNewUrl] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newUrl.trim()) {
      onAnalyzeNew(newUrl.trim());
      setNewUrl('');
    }
  };

  return (
    <div className="analysis-header-wrapper">
      <div className="header-meta">
        <h1 className="header-title">Repository Insight</h1>
        <p className="header-active-repo">
          <span className="repo-label">TARGET:</span>
          <span className="repo-val" title={currentUrl}>{currentUrl}</span>
        </p>
        <button
          type="button"
          className="header-suggest-architecture-btn"
          onClick={() => navigate(`/architecture-recommendation?url=${encodeURIComponent(currentUrl)}`)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
            <polygon points="12 2 2 22 22 22"></polygon>
          </svg>
          Suggest Architecture Plan
        </button>
      </div>

      <form onSubmit={handleSubmit} className="header-search-form">
        <div className="header-input-container">
          <span className="header-input-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
          </span>
          <input
            type="url"
            placeholder="Analyze another repository..."
            className="header-search-input"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="header-analyze-btn">
          <img src={analyzeRepositoryIcon} alt="" className="header-btn-icon" />
          <span>Analyze</span>
        </button>
      </form>
    </div>
  );
}

export default AnalysisHeader;
