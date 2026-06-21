import React from 'react';
import './PlanBreakdown.css';

function PlanBreakdown() {
  // SVG circular segments calculation
  // Radius r = 50, Center cx = 80, cy = 80
  // Circumference = 2 * PI * 50 = 314.16
  // Proportions: Enterprise (45%), Professional (30%), Starter (25%)
  
  const enterpriseLength = 314.16 * 0.45; // 141.37
  const proLength = 314.16 * 0.30;        // 94.25
  const starterLength = 314.16 * 0.25;    // 78.54

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

          {/* Starter (25%) - blue */}
          <circle 
            cx="80" 
            cy="80" 
            r="50" 
            fill="transparent" 
            stroke="#3b82f6" 
            strokeWidth="16" 
            strokeDasharray={`${starterLength} 314.16`}
            strokeDashoffset="-235.62" // -(enterpriseLength + proLength)
            transform="rotate(-90 80 80)"
            className="donut-segment starter"
          />

          {/* Professional (30%) - green */}
          <circle 
            cx="80" 
            cy="80" 
            r="50" 
            fill="transparent" 
            stroke="#10b981" 
            strokeWidth="16" 
            strokeDasharray={`${proLength} 314.16`}
            strokeDashoffset="-141.37" // -enterpriseLength
            transform="rotate(-90 80 80)"
            className="donut-segment professional"
          />

          {/* Enterprise (45%) - purple */}
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
          <span className="donut-lbl-value">12.4k</span>
        </div>
      </div>

      {/* Legend list below */}
      <div className="breakdown-legends">
        <div className="breakdown-legend-row">
          <div className="legend-left">
            <span className="legend-indicator enterprise" />
            <span className="plan-name-label">Enterprise</span>
          </div>
          <span className="plan-pct-value">45%</span>
        </div>
        
        <div className="breakdown-legend-row">
          <div className="legend-left">
            <span className="legend-indicator professional" />
            <span className="plan-name-label">Professional</span>
          </div>
          <span className="plan-pct-value">30%</span>
        </div>

        <div className="breakdown-legend-row">
          <div className="legend-left">
            <span className="legend-indicator starter" />
            <span className="plan-name-label">Starter</span>
          </div>
          <span className="plan-pct-value">25%</span>
        </div>
      </div>
    </div>
  );
}

export default PlanBreakdown;
