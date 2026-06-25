import React from 'react';
import './PlanBreakdown.css';

function PlanBreakdown({ planData, stats }) {
  // Map input planData
  let enterpriseCount = 0;
  let proCount = 0;
  let starterCount = 0;

  if (planData && planData.length > 0) {
    planData.forEach(item => {
      const name = item.name.toLowerCase();
      if (name.includes('enterprise')) {
        enterpriseCount += item.count || 0;
      } else if (name.includes('pro') || name.includes('professional')) {
        proCount += item.count || 0;
      } else {
        starterCount += item.count || 0;
      }
    });
  } else {
    // Default to zero if no data exists
    enterpriseCount = 0;
    proCount = 0;
    starterCount = 0;
  }

  const total = enterpriseCount + proCount + starterCount || 0;
  const enterprisePct = total > 0 ? parseFloat(((enterpriseCount / total) * 100).toFixed(0)) : 0;
  const proPct = total > 0 ? parseFloat(((proCount / total) * 100).toFixed(0)) : 0;
  const starterPct = total > 0 ? 100 - enterprisePct - proPct : 0;

  const enterpriseLength = 314.16 * (enterprisePct / 100);
  const proLength = 314.16 * (proPct / 100);
  const starterLength = 314.16 * (starterPct / 100);

  // Format total users display
  // Format total users display
  const displayTotal = stats?.totalUsers !== undefined 
    ? (stats.totalUsers >= 1000 ? `${(stats.totalUsers / 1000).toFixed(1)}k` : stats.totalUsers) 
    : '0';

  return (
    <div className="plan-breakdown-card">
      <h3 className="breakdown-card-title">Plan Breakdown</h3>
      
      <div className="breakdown-chart-wrapper">
        <svg viewBox="0 0 160 160" className="donut-svg">
          {/* Background circle */}
          <circle 
            cx="80" 
            cy="80" 
            r="50" 
            fill="transparent" 
            stroke="rgba(255, 255, 255, 0.02)" 
            strokeWidth="16" 
          />

          {/* Starter - blue */}
          <circle 
            cx="80" 
            cy="80" 
            r="50" 
            fill="transparent" 
            stroke="#3b82f6" 
            strokeWidth="16" 
            strokeDasharray={`${starterLength} 314.16`}
            strokeDashoffset={-(enterpriseLength + proLength)}
            transform="rotate(-90 80 80)"
            className="donut-segment starter"
          />

          {/* Professional - green */}
          <circle 
            cx="80" 
            cy="80" 
            r="50" 
            fill="transparent" 
            stroke="#10b981" 
            strokeWidth="16" 
            strokeDasharray={`${proLength} 314.16`}
            strokeDashoffset={-enterpriseLength}
            transform="rotate(-90 80 80)"
            className="donut-segment professional"
          />

          {/* Enterprise - purple */}
          <circle 
            cx="80" 
            cy="80" 
            r="50" 
            fill="transparent" 
            stroke="#8b5cf6" 
            strokeWidth="16" 
            strokeDasharray={`${enterpriseLength} 314.16`}
            strokeDashoffset="0"
            transform="rotate(-90 80 80)"
            className="donut-segment enterprise"
          />
        </svg>

        {/* Center overlay label */}
        <div className="donut-center-label">
          <span className="donut-lbl-title">TOTAL USERS</span>
          <span className="donut-lbl-value">{displayTotal}</span>
        </div>
      </div>

      {/* Legend list below */}
      <div className="breakdown-legends">
        <div className="breakdown-legend-row">
          <div className="legend-left">
            <span className="legend-indicator enterprise" />
            <span className="plan-name-label">Enterprise</span>
          </div>
          <span className="plan-pct-value">{enterprisePct}%</span>
        </div>
        
        <div className="breakdown-legend-row">
          <div className="legend-left">
            <span className="legend-indicator professional" />
            <span className="plan-name-label">Professional</span>
          </div>
          <span className="plan-pct-value">{proPct}%</span>
        </div>

        <div className="breakdown-legend-row">
          <div className="legend-left">
            <span className="legend-indicator starter" />
            <span className="plan-name-label">Starter / Free</span>
          </div>
          <span className="plan-pct-value">{starterPct}%</span>
        </div>
      </div>
    </div>
  );
}

export default PlanBreakdown;
