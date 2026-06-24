import React, { useState } from 'react';
import './RevenueTrendChart.css';

// SVG Dimensions
const width = 580;
const height = 220;

function RevenueTrendChart({ trendData }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // If no trendData or empty, use fallback defaults
  const rawData = trendData && trendData.length > 0 ? trendData : [
    { name: 'JAN', Revenue: 110000 },
    { name: 'FEB', Revenue: 135000 },
    { name: 'MAR', Revenue: 125000 },
    { name: 'APR', Revenue: 178000 },
    { name: 'MAY', Revenue: 202000 },
    { name: 'JUN', Revenue: 255000 },
    { name: 'JUL', Revenue: 240000 },
    { name: 'AUG', Revenue: 310000 },
    { name: 'SEP', Revenue: 292000 }
  ];

  const maxRevenue = Math.max(...rawData.map(d => d.Revenue), 1);
  const dataPoints = rawData.map((d, i) => {
    const x = rawData.length > 1 ? 50 + i * (480 / (rawData.length - 1)) : 50;
    // Map value to Y coordinates between 200 (base) and 50 (top)
    const actualY = 200 - (d.Revenue / maxRevenue) * 140; 
    // Mock projected Y as slightly offset
    const projY = actualY - 10 + Math.sin(i) * 15;

    const formatMoney = (val) => {
      if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
      return `$${val}`;
    };

    return {
      index: i,
      month: d.name,
      x,
      actualY,
      projY,
      actualVal: formatMoney(d.Revenue),
      projVal: formatMoney(d.Revenue * 1.08)
    };
  });

  // Generate SVG path strings
  const getLinePath = (key) => {
    return dataPoints.reduce((path, p, i) => {
      const y = key === 'actual' ? p.actualY : p.projY;
      if (i === 0) return `M ${p.x} ${y}`;
      
      // Control points for smooth bezier curve
      const prev = dataPoints[i - 1];
      const prevY = key === 'actual' ? prev.actualY : prev.projY;
      const cp1x = prev.x + (p.x - prev.x) / 2;
      const cp1y = prevY;
      const cp2x = p.x - (p.x - prev.x) / 2;
      const cp2y = y;
      
      return `${path} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p.x} ${y}`;
    }, '');
  };

  const getAreaPath = () => {
    const linePath = getLinePath('actual');
    const firstPoint = dataPoints[0];
    const lastPoint = dataPoints[dataPoints.length - 1];
    return `${linePath} L ${lastPoint.x} 200 L ${firstPoint.x} 200 Z`;
  };

  return (
    <div className="revenue-trend-card">
      <div className="chart-card-header">
        <h3 className="chart-card-title">Revenue Trend</h3>
        <div className="chart-legends">
          <div className="legend-item">
            <span className="legend-dot projected" />
            <span className="legend-text">Projected</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot actual" />
            <span className="legend-text">Actual</span>
          </div>
        </div>
      </div>

      <div className="chart-body">
        <svg viewBox={`0 0 ${width} ${height}`} className="trend-svg">
          <defs>
            {/* Area gradient */}
            <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="50" y1="50" x2="530" y2="50" className="chart-grid-line" />
          <line x1="50" y1="100" x2="530" y2="100" className="chart-grid-line" />
          <line x1="50" y1="150" x2="530" y2="150" className="chart-grid-line" />
          <line x1="50" y1="200" x2="530" y2="200" className="chart-grid-line base" />

          {/* Filled Area beneath Actual Line */}
          <path d={getAreaPath()} fill="url(#area-grad)" />

          {/* Projected Line (Dashed) */}
          <path 
            d={getLinePath('projected')} 
            fill="none" 
            stroke="rgba(139, 92, 246, 0.45)" 
            strokeWidth="2" 
            strokeDasharray="4 4" 
          />

          {/* Actual Line (Solid) */}
          <path 
            d={getLinePath('actual')} 
            fill="none" 
            stroke="#10b981" 
            strokeWidth="3" 
            strokeLinecap="round"
          />

          {/* X Axis Labels */}
          {dataPoints.map((p) => (
            <text 
              key={p.index} 
              x={p.x} 
              y={218} 
              className="chart-axis-text"
              textAnchor="middle"
            >
              {p.month}
            </text>
          ))}

          {/* Hover indicator guideline */}
          {hoveredPoint && (
            <line 
              x1={hoveredPoint.x} 
              y1="40" 
              x2={hoveredPoint.x} 
              y2="200" 
              className="chart-guideline" 
            />
          )}

          {/* Dots on top of lines */}
          {dataPoints.map((p) => {
            const isHovered = hoveredPoint && hoveredPoint.index === p.index;
            return (
              <g key={p.index}>
                {/* Projected dots */}
                <circle 
                  cx={p.x} 
                  cy={p.projY} 
                  r={isHovered ? 5 : 3} 
                  className={`chart-dot projected ${isHovered ? 'hovered' : ''}`}
                />
                
                {/* Actual dots */}
                <circle 
                  cx={p.x} 
                  cy={p.actualY} 
                  r={isHovered ? 6 : 4} 
                  className={`chart-dot actual ${isHovered ? 'hovered' : ''}`}
                />
              </g>
            );
          })}

          {/* Hover trigger areas */}
          {dataPoints.map((p) => (
            <rect
              key={p.index}
              x={p.x - 20}
              y="20"
              width="40"
              height="180"
              fill="transparent"
              className="chart-trigger"
              onMouseEnter={() => setHoveredPoint(p)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}
        </svg>

        {/* Dynamic Tooltip */}
        {hoveredPoint && (
          <div 
            className="chart-tooltip" 
            style={{ 
              left: `${(hoveredPoint.x / width) * 100}%`,
              transform: `translateX(-50%) translateY(-100%)`,
              top: `${Math.min(hoveredPoint.actualY, hoveredPoint.projY) - 15}px`
            }}
          >
            <div className="tooltip-month">{hoveredPoint.month} Revenue</div>
            <div className="tooltip-row">
              <span className="tooltip-dot actual" />
              <span className="tooltip-lbl">Actual:</span>
              <strong className="tooltip-val actual">{hoveredPoint.actualVal}</strong>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-dot projected" />
              <span className="tooltip-lbl">Projected:</span>
              <strong className="tooltip-val projected">{hoveredPoint.projVal}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RevenueTrendChart;
