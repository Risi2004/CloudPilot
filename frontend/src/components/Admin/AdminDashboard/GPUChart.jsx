import React, { useState } from 'react';
import './GPUChart.css';

const CHART_DATA = {
  LIVE: [
    { value: 35, label: '00:00 UTC' },
    { value: 55, label: '' },
    { value: 42, label: '04:00' },
    { value: 72, label: '' },
    { value: 58, label: '08:00 UTC' },
    { value: 50, label: '', isHighlighted: true },
    { value: 85, label: '12:00 UTC' },
    { value: 70, label: '' },
    { value: 55, label: '16:00 UTC' },
    { value: 32, label: '20:00 UTC' }
  ],
  '24H': [
    { value: 62, label: '00:00 UTC' },
    { value: 45, label: '' },
    { value: 80, label: '04:00' },
    { value: 92, label: '' },
    { value: 68, label: '08:00 UTC' },
    { value: 40, label: '', isHighlighted: true },
    { value: 75, label: '12:00 UTC' },
    { value: 60, label: '' },
    { value: 78, label: '16:00 UTC' },
    { value: 45, label: '20:00 UTC' }
  ],
  '7D': [
    { value: 45, label: 'Mon' },
    { value: 65, label: 'Tue' },
    { value: 50, label: 'Wed' },
    { value: 88, label: 'Thu' },
    { value: 72, label: 'Fri' },
    { value: 55, label: 'Sat', isHighlighted: true },
    { value: 68, label: 'Sun' },
    { value: 82, label: 'Mon' },
    { value: 60, label: 'Tue' },
    { value: 40, label: 'Wed' }
  ]
};

function GPUChart() {
  const [activeInterval, setActiveInterval] = useState('LIVE');
  const [hoveredBar, setHoveredBar] = useState(null);

  const currentData = CHART_DATA[activeInterval];
  const maxVal = 100;
  
  // SVG size specs
  const width = 600;
  const height = 180;
  const bottomPadding = 30;
  const chartHeight = height - bottomPadding;

  return (
    <div className="gpu-chart-card">
      <div className="gpu-chart-header">
        <div className="gpu-title-group">
          <h3 className="gpu-chart-title">AI Processing Intelligence</h3>
          <span className="gpu-chart-subtitle">Global GPU utilization and request distribution.</span>
        </div>
        <div className="gpu-chart-tabs">
          {['LIVE', '24H', '7D'].map((interval) => (
            <button
              key={interval}
              className={`gpu-tab-btn ${activeInterval === interval ? 'active' : ''}`}
              onClick={() => setActiveInterval(interval)}
            >
              {interval}
            </button>
          ))}
        </div>
      </div>

      <div className="gpu-chart-body">
        {/* Tooltip */}
        <div className={`gpu-tooltip ${hoveredBar !== null ? 'visible' : ''}`} 
             style={{ 
               left: hoveredBar ? `${hoveredBar.x}px` : '0px', 
               top: hoveredBar ? `${hoveredBar.y - 40}px` : '0px'
             }}>
          {hoveredBar && (
            <>
              <span className="tooltip-value">{hoveredBar.value}%</span>
              <span className="tooltip-label">Utilization</span>
            </>
          )}
        </div>

        {/* Custom SVG Bar Chart */}
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" className="gpu-svg">
          {/* Background grid lines */}
          <line x1="0" y1={chartHeight * 0.25} x2={width} y2={chartHeight * 0.25} className="grid-line" />
          <line x1="0" y1={chartHeight * 0.5} x2={width} y2={chartHeight * 0.5} className="grid-line" />
          <line x1="0" y1={chartHeight * 0.75} x2={width} y2={chartHeight * 0.75} className="grid-line" />

          {/* Bar elements */}
          {currentData.map((d, i) => {
            const barWidth = 32;
            const gap = (width - barWidth * currentData.length) / (currentData.length - 1);
            const x = i * (barWidth + gap);
            const barHeight = (d.value / maxVal) * chartHeight;
            const y = chartHeight - barHeight;

            return (
              <g 
                key={i} 
                className="bar-group"
                onMouseEnter={(e) => {
                  const svgRect = e.currentTarget.getBoundingClientRect();
                  const containerRect = e.currentTarget.ownerSVGElement.parentNode.getBoundingClientRect();
                  setHoveredBar({
                    value: d.value,
                    x: svgRect.left - containerRect.left + barWidth / 2,
                    y: svgRect.top - containerRect.top
                  });
                }}
                onMouseLeave={() => setHoveredBar(null)}
              >
                {/* Visual bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="4"
                  className={`gpu-bar ${d.isHighlighted ? 'highlighted' : ''}`}
                />
                
                {/* Labels along X-Axis */}
                {d.label && (
                  <text
                    x={x + barWidth / 2}
                    y={height - 8}
                    textAnchor="middle"
                    className="gpu-axis-label"
                  >
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* X-Axis bottom line */}
          <line x1="0" y1={chartHeight} x2={width} y2={chartHeight} className="axis-line" />
        </svg>
      </div>
    </div>
  );
}

export default GPUChart;
