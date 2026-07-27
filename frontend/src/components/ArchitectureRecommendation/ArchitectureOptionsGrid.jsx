import React from 'react';
import './ArchitectureOptionsGrid.css';

const GOOD_ON_HIGH = new Set(['scalability', 'reliability']);

function ratingClass(metric, value) {
  const v = String(value || '').toLowerCase();
  const goodOnHigh = GOOD_ON_HIGH.has(metric);
  if (v === 'high') return goodOnHigh ? 'good' : 'bad';
  if (v === 'low') return goodOnHigh ? 'bad' : 'good';
  return 'mid';
}

function RatingPill({ label, metric, value }) {
  if (!value) return null;
  return (
    <div className={`arch-rating-pill arch-rating-${ratingClass(metric, value)}`}>
      <span className="arch-rating-label">{label}</span>
      <span className="arch-rating-value">{value}</span>
    </div>
  );
}

function formatCostRange(costEstimate) {
  if (!costEstimate) return null;
  const { monthlyLowUSD, monthlyHighUSD } = costEstimate;
  if (monthlyLowUSD === undefined && monthlyHighUSD === undefined) return null;
  if (monthlyLowUSD === monthlyHighUSD) return `$${monthlyLowUSD}/mo`;
  if (!monthlyLowUSD) return `Free – $${monthlyHighUSD}/mo`;
  return `$${monthlyLowUSD} – $${monthlyHighUSD}/mo`;
}

function ArchitectureOptionsGrid({ options, recommendedOptionId, selectedId, onSelect }) {
  if (!Array.isArray(options) || options.length === 0) return null;

  return (
    <div className="arch-options-grid">
      {options.map((opt) => {
        const isRecommended = opt.recommended || opt.id === recommendedOptionId;
        const isSelected = opt.id === selectedId;
        const pros = Array.isArray(opt.pros) ? opt.pros : [];
        const cons = Array.isArray(opt.cons) ? opt.cons : [];
        const costLabel = formatCostRange(opt.costEstimate);

        return (
          <div
            key={opt.id}
            className={`arch-option-card ${isSelected ? 'selected' : ''} ${isRecommended ? 'recommended' : ''}`}
            onClick={() => onSelect(opt.id)}
          >
            <div className="arch-option-header">
              {opt.pattern && <span className="arch-pattern-badge font-mono">{opt.pattern}</span>}
              {isRecommended && <span className="arch-recommended-badge">RECOMMENDED</span>}
            </div>

            <h3 className="arch-option-name">{opt.name}</h3>
            {opt.summary && <p className="arch-option-summary">{opt.summary}</p>}

            {costLabel && (
              <div className="arch-cost-row">
                <span className="arch-cost-label">EST. MONTHLY COST</span>
                <span className="arch-cost-value">{costLabel}</span>
              </div>
            )}

            <div className="arch-ratings-row">
              <RatingPill label="Complexity" metric="complexity" value={opt.complexity} />
              <RatingPill label="Scalability" metric="scalability" value={opt.scalability} />
              <RatingPill label="Reliability" metric="reliability" value={opt.reliability} />
            </div>

            {(pros.length > 0 || cons.length > 0) && (
              <div className="arch-pros-cons-grid">
                <div className="arch-pros-col">
                  <span className="arch-col-header pro">PROS</span>
                  <ul className="arch-col-list">
                    {pros.slice(0, 3).map((p, idx) => (
                      <li key={idx}><span className="arch-bullet pro">✓</span>{p}</li>
                    ))}
                  </ul>
                </div>
                <div className="arch-cons-col">
                  <span className="arch-col-header con">CONS</span>
                  <ul className="arch-col-list">
                    {cons.slice(0, 3).map((c, idx) => (
                      <li key={idx}><span className="arch-bullet con">⚠</span>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {opt.bestFor && (
              <p className="arch-best-for"><span>Best for:</span> {opt.bestFor}</p>
            )}

            <button
              type="button"
              className="arch-view-details-btn"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(opt.id);
              }}
            >
              {isSelected ? 'Viewing Details ▲' : 'View Details ▼'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ArchitectureOptionsGrid;
