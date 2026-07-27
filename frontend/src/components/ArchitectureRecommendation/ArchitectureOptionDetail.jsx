import React from 'react';
import './ArchitectureOptionDetail.css';

function formatCostRange(costEstimate) {
  if (!costEstimate) return null;
  const { monthlyLowUSD, monthlyHighUSD } = costEstimate;
  if (monthlyLowUSD === undefined && monthlyHighUSD === undefined) return null;
  if (monthlyLowUSD === monthlyHighUSD) return `$${monthlyLowUSD}/mo`;
  if (!monthlyLowUSD) return `Free – $${monthlyHighUSD}/mo`;
  return `$${monthlyLowUSD} – $${monthlyHighUSD}/mo`;
}

function ArchitectureOptionDetail({ option }) {
  if (!option) return null;

  const components = Array.isArray(option.components) ? option.components : [];
  const reasoning = Array.isArray(option.reasoning) ? option.reasoning : [];
  const citations = Array.isArray(option.citations) ? option.citations : [];
  const breakdown = (option.costEstimate && Array.isArray(option.costEstimate.breakdown))
    ? option.costEstimate.breakdown
    : [];
  const costLabel = formatCostRange(option.costEstimate);

  return (
    <div className="arch-detail-wrapper">
      <div className="arch-detail-header">
        <div>
          <span className="arch-detail-eyebrow font-mono">SELECTED OPTION</span>
          <h3 className="arch-detail-title">{option.name}</h3>
        </div>
        {(option.recommended) && <span className="arch-recommended-badge">RECOMMENDED</span>}
      </div>

      {components.length > 0 && (
        <div className="arch-flow-row">
          {components.map((c, idx) => (
            <React.Fragment key={idx}>
              <div className="arch-flow-box">
                <span className="arch-flow-name">{c.name}</span>
                {c.service && <span className="arch-flow-service font-mono">{c.service}</span>}
                {c.role && <span className="arch-flow-role">{c.role}</span>}
              </div>
              {idx < components.length - 1 && <div className="arch-flow-arrow">→</div>}
            </React.Fragment>
          ))}
        </div>
      )}

      <div className="arch-detail-grid">
        <div className="arch-cost-box">
          <h4 className="arch-detail-section-title">Cost Breakdown</h4>
          {costLabel && <div className="arch-cost-total">{costLabel}</div>}
          {breakdown.length > 0 && (
            <div className="arch-cost-items">
              {breakdown.map((b, idx) => (
                <div key={idx} className="arch-cost-item-row">
                  <span>{b.item}</span>
                  <span className="font-mono">{b.costUSD}</span>
                </div>
              ))}
            </div>
          )}
          {option.costEstimate && option.costEstimate.notes && (
            <p className="arch-cost-notes">{option.costEstimate.notes}</p>
          )}
        </div>

        <div className="arch-reasoning-box">
          <h4 className="arch-detail-section-title">Why this option</h4>
          {reasoning.length > 0 && (
            <ul className="arch-reasoning-list">
              {reasoning.map((r, idx) => <li key={idx}>{r}</li>)}
            </ul>
          )}
          {citations.length > 0 && (
            <div className="arch-citations-row">
              {citations.map((c, idx) => (
                <span key={idx} className="arch-citation-tag">{c}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ArchitectureOptionDetail;
