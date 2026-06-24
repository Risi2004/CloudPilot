import React, { useState } from 'react';
import './AcquisitionVolume.css';

function AcquisitionVolume({ acquisitionData }) {
  const [hoveredBar, setHoveredBar] = useState(null);

  // Fallback mock data
  const rawData = acquisitionData && acquisitionData.length > 0 ? acquisitionData : [
    { name: 'Oct 15', Volume: 24 },
    { name: 'Oct 16', Volume: 38 },
    { name: 'Oct 17', Volume: 30 },
    { name: 'Oct 18', Volume: 72 },
    { name: 'Oct 19', Volume: 48 },
    { name: 'Oct 20', Volume: 20 },
    { name: 'Oct 21', Volume: 42 },
    { name: 'Oct 22', Volume: 60 },
    { name: 'Oct 23', Volume: 32 },
    { name: 'Oct 24', Volume: 55 }
  ];

  const DAILY_DATA = rawData.map((d, i) => ({
    day: `Day ${i + 1}`,
    val: d.Volume,
    label: d.name
  }));

  // SVG parameters
  const svgWidth = 720;
  const svgHeight = 120;
  const maxVal = Math.max(...DAILY_DATA.map(d => d.val), 10);
  
  // Bar width and spacing
  const barWidth = Math.max(10, Math.min(42, (680 / DAILY_DATA.length) - 15));
  const gap = Math.max(5, (680 - barWidth * DAILY_DATA.length) / (DAILY_DATA.length - 1 || 1));
  const startX = 20;

  return (
    <div className="acquisition-volume-card">
      <div className="acquisition-header">
        <h3 className="acquisition-title">Acquisition Volume</h3>
        <p className="acquisition-subtitle">Daily new subscriber sign-ups across all regions.</p>
      </div>

      <div className="acquisition-chart-container">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="bar-chart-svg">
          {/* Background Grid Lines */}
          <line x1="10" y1="20" x2={svgWidth - 10} y2="20" className="bar-grid-line" />
          <line x1="10" y1="60" x2={svgWidth - 10} y2="60" className="bar-grid-line" />
          <line x1="10" y1="100" x2={svgWidth - 10} y2="100" className="bar-grid-line base" />

          {/* Render Bars */}
          {DAILY_DATA.map((d, i) => {
            const x = startX + i * (barWidth + gap);
            // Calculate bar height relative to maxVal
            const barHeight = (d.val / maxVal) * 80; // max height is 80px
            const y = 100 - barHeight;
            const isHovered = hoveredBar && hoveredBar.day === d.day;

            return (
              <g key={d.day}>
                {/* Visual Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="4"
                  ry="4"
                  className={`volume-bar ${isHovered ? 'hovered' : ''}`}
                />

                {/* Hover hotspot */}
                <rect
                  x={x - gap/2}
                  y="10"
                  width={barWidth + gap}
                  height="100"
                  fill="transparent"
                  className="bar-hotspot"
                  onMouseEnter={() => setHoveredBar(d)}
                  onMouseLeave={() => setHoveredBar(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Dynamic Overlay Tooltip */}
        {hoveredBar && (
          <div 
            className="bar-tooltip"
            style={{
              left: `${((startX + DAILY_DATA.findIndex(d => d.day === hoveredBar.day) * (barWidth + gap) + barWidth/2) / svgWidth) * 100}%`,
              transform: 'translateX(-50%) translateY(-110%)',
              top: `${100 - (hoveredBar.val / maxVal) * 80 - 10}px`
            }}
          >
            <span className="tooltip-date">{hoveredBar.label}</span>
            <strong className="tooltip-value">+{hoveredBar.val} Sign-ups</strong>
          </div>
        )}
      </div>
    </div>
  );
}

export default AcquisitionVolume;
