import React, { useState } from 'react';
import './CostSummary.css';

function CostSummary({ deployments = [], credentials = [] }) {
  const [savingsApplied, setSavingsApplied] = useState(false);
  const [applying, setApplying] = useState(false);

  const handleApplySavings = () => {
    setApplying(true);
    setTimeout(() => {
      setApplying(false);
      setSavingsApplied(true);
    }, 2000);
  };

  let totalSpend = 0;
  let renderSpend = 0;
  let vercelSpend = 0;

  deployments.forEach((dep) => {
    if (dep.status === 'succeeded' || dep.status === 'running') {
      const costEstimate = dep.architectureSnapshot?.costEstimate || {};
      const low = costEstimate.monthlyLowUSD ?? 0;
      
      const breakdown = costEstimate.breakdown || [];
      if (breakdown.length > 0) {
        breakdown.forEach((b) => {
          const item = String(b.item).toLowerCase();
          const costVal = parseFloat(String(b.costUSD).replace(/[^0-9.]/g, '')) || 0;
          if (item.includes('render')) {
            renderSpend += costVal;
          } else if (item.includes('vercel')) {
            vercelSpend += costVal;
          }
        });
      } else {
        totalSpend += low;
      }
    }
  });

  if (renderSpend > 0 || vercelSpend > 0) {
    totalSpend = renderSpend + vercelSpend;
  }

  const savingsPotential = Math.round(totalSpend * 0.22); // Assume ~22% optimization savings
  const finalSpend = totalSpend;

  const renderPct = finalSpend > 0 ? Math.round((renderSpend / finalSpend) * 100) : 0;
  const vercelPct = finalSpend > 0 ? Math.round((vercelSpend / finalSpend) * 100) : 0;

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
        <span className="cost-month-tag">
          {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
      </div>

      <div className="cost-stats-grid">
        <div className="cost-stat-box">
          <span className="cost-stat-label">Current Spend</span>
          <span className="cost-stat-value">${finalSpend.toFixed(2)}</span>
          <span className="cost-stat-trend up">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
            0% vs last month
          </span>
        </div>

        <div className="cost-stat-box savings-box">
          <span className="cost-stat-label">AI Savings Potential</span>
          <span className="cost-stat-value savings-amount">${savingsPotential.toFixed(2)}</span>
          <span className="cost-stat-trend positive">
            Reduce spend by ~22%
          </span>
        </div>
      </div>

      <div className="provider-breakdown">
        <div className="breakdown-header">
          <span className="breakdown-title">Spend by Provider</span>
          <span className="breakdown-total">${finalSpend.toFixed(2)} total</span>
        </div>
        <div className="breakdown-bar">
          {finalSpend === 0 ? (
            <div className="breakdown-segment empty" style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)' }} title="No spend: $0.00"></div>
          ) : (
            <>
              {renderSpend > 0 && (
                <div className="breakdown-segment render" style={{ width: `${renderPct}%`, background: '#46a354' }} title={`Render: $${renderSpend.toFixed(2)} (${renderPct}%)`}></div>
              )}
              {vercelSpend > 0 && (
                <div className="breakdown-segment vercel" style={{ width: `${vercelPct}%`, background: '#ffffff' }} title={`Vercel: $${vercelSpend.toFixed(2)} (${vercelPct}%)`}></div>
              )}
            </>
          )}
        </div>
        <div className="breakdown-legend">
          {finalSpend === 0 ? (
            <span style={{ fontSize: '11px', color: '#64748b' }}>No active provider billing</span>
          ) : (
            <>
              {renderSpend > 0 && (
                <div className="legend-item">
                  <span className="legend-dot render" style={{ background: '#46a354' }}></span>
                  <span className="legend-text">Render (${renderSpend.toFixed(2)})</span>
                </div>
              )}
              {vercelSpend > 0 && (
                <div className="legend-item">
                  <span className="legend-dot vercel" style={{ background: '#ffffff' }}></span>
                  <span className="legend-text">Vercel (${vercelSpend.toFixed(2)})</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="cost-action-container">
        <button
          id="btn-apply-savings"
          className={`apply-savings-btn ${savingsApplied ? 'applied' : ''} ${applying ? 'loading' : ''}`}
          onClick={handleApplySavings}
          disabled={savingsApplied || applying || finalSpend === 0}
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
