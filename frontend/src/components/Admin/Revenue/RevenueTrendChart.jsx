import React, { useState } from 'react';
import './RevenueTrendChart.css';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP'];

const DATA_POINTS = [
  { index: 0, month: 'JAN', x: 50, actualY: 190, projY: 190, actualVal: '$110k', projVal: '$110k' },
  { index: 1, month: 'FEB', x: 110, actualY: 170, projY: 175, actualVal: '$135k', projVal: '$128k' },
  { index: 2, month: 'MAR', x: 170, actualY: 178, projY: 180, actualVal: '$125k', projVal: '$120k' },
  { index: 3, month: 'APR', x: 230, actualY: 145, projY: 158, actualVal: '$178k', projVal: '$158k' },
  { index: 4, month: 'MAY', x: 290, actualY: 130, projY: 145, actualVal: '$202k', projVal: '$178k' },
  { index: 5, month: 'JUN', x: 350, actualY: 102, projY: 125, actualVal: '$255k', projVal: '$210k' },
  { index: 6, month: 'JUL', x: 410, actualY: 110, projY: 122, actualVal: '$240k', projVal: '$215k' },
  { index: 7, month: 'AUG', x: 470, actualY: 78, projY: 105, actualVal: '$310k', projVal: '$250k' },
  { index: 8, month: 'SEP', x: 530, actualY: 88, projY: 112, actualVal: '$292k', projVal: '$238k' }
];

// SVG Dimensions
const width = 580;
const height = 220;

function RevenueTrendChart() {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Generate SVG path strings
  const getLinePath = (key) => {
    return DATA_POINTS.reduce((path, p, i) => {
      const y = key === 'actual' ? p.actualY : p.projY;
      if (i === 0) return `M ${p.x} ${y}`;
      
      // Control points for smooth bezier curve
      const prev = DATA_POINTS[i - 1];
      const prevY = key === 'actual' ? prev.actualY : prev.projY;
      const cp1x = prev.x + 25;
      const cp1y = prevY;
      const cp2x = p.x - 25;
      const cp2y = y;
      
      return `${path} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p.x} ${y}`;
    }, '');
  };

  const getAreaPath = () => {
    const linePath = getLinePath('actual');
    const firstPoint = DATA_POINTS[0];
    const lastPoint = DATA_POINTS[DATA_POINTS.length - 1];
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
          {DATA_POINTS.map((p) => (
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
          {DATA_POINTS.map((p) => {
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
          {DATA_POINTS.map((p) => (
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
