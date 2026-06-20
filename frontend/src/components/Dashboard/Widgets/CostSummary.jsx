import React, { useState } from 'react';
import './CostSummary.css';

function CostSummary() {
  const [savingsApplied, setSavingsApplied] = useState(false);
  const [applying, setApplying] = useState(false);

  const handleApplySavings = () => {
    setApplying(true);
    setTimeout(() => {
      setApplying(false);
      setSavingsApplied(true);
    }, 2000);
  };

  return (
    <section className="widget-card cost-summary-card">
      <div className="widget-header">
        <div className="widget-header-title">
          <svg className="widget-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
          <h3>Cost & Savings Summary</h3>
        </div>
        <span className="cost-month-tag">June 2026</span>
      </div>

      <div className="cost-stats-grid">
        <div className="cost-stat-box">
          <span className="cost-stat-label">Current Spend</span>
          <span className="cost-stat-value">$1,240.50</span>
          <span className="cost-stat-trend up">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
            4.2% vs last month
          </span>
        </div>

        <div className="cost-stat-box savings-box">
          <span className="cost-stat-label">AI Savings Potential</span>
          <span className="cost-stat-value savings-amount">$340.00</span>
          <span className="cost-stat-trend positive">
            Reduce spend by ~27%
          </span>
        </div>
      </div>

      <div className="provider-breakdown">
        <div className="breakdown-header">
          <span className="breakdown-title">Spend by Provider</span>
          <span className="breakdown-total">$1,240.50 total</span>
        </div>
        <div className="breakdown-bar">
          <div className="breakdown-segment aws" style={{ width: '68%' }} title="AWS: $850.50 (68%)"></div>
          <div className="breakdown-segment vercel" style={{ width: '17%' }} title="Vercel: $210.00 (17%)"></div>
          <div className="breakdown-segment gcp" style={{ width: '15%' }} title="GCP: $180.00 (15%)"></div>
        </div>
        <div className="breakdown-legend">
          <div className="legend-item">
            <span className="legend-dot aws"></span>
            <span className="legend-text">AWS ($850.50)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot vercel"></span>
            <span className="legend-text">Vercel ($210.00)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot gcp"></span>
            <span className="legend-text">GCP ($180.00)</span>
          </div>
        </div>
      </div>

      <div className="cost-action-container">
        <button
          id="btn-apply-savings"
          className={`apply-savings-btn ${savingsApplied ? 'applied' : ''} ${applying ? 'loading' : ''}`}
          onClick={handleApplySavings}
          disabled={savingsApplied || applying}
        >
          {applying && (
            <>
              <span className="spinner"></span>
              Optimizing Cloud Resources...
            </>
          )}
          {!applying && savingsApplied && (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Savings Applied Successfully!
            </>
          )}
          {!applying && !savingsApplied && 'Apply AI Savings Recommendations'}
        </button>
      </div>
    </section>
  );
}

export default CostSummary;
