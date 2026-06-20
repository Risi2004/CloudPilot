import React from 'react';
import './CostBreakdown.css';

function CostBreakdown({ provider, costItems, totalCost }) {
  return (
    <div className="cost-breakdown-card">
      <div className="cost-breakdown-header">
        <h3 className="cost-breakdown-title">Estimated Monthly Cost breakdown</h3>
        <span className="cost-provider-badge">{provider}</span>
      </div>

      <div className="cost-total-hero">
        <div className="cost-hero-text">
          <span className="cost-hero-val">{totalCost}</span>
          <span className="cost-hero-label">ESTIMATED BILL / MONTH</span>
        </div>
        <div className="cost-hero-desc">
          Calculated by cost estimation agents using standard resource sizes based on scanned system dependencies.
        </div>
      </div>

      <div className="cost-items-list">
        <div className="cost-items-header">
          <span>RESOURCE DESCRIPTION</span>
          <span>ESTIMATED PRICE</span>
        </div>
        {costItems.map((item, idx) => (
          <div key={idx} className="cost-item-row">
            <div className="cost-item-info">
              <span className="cost-item-bullet"></span>
              <span className="cost-item-name">{item.item}</span>
            </div>
            <span className="cost-item-val font-mono">{item.cost}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CostBreakdown;
