import React, { useState } from 'react';
import './AcquisitionVolume.css';

const DAILY_DATA = [
  { day: 'Day 1', val: 24, label: 'Oct 15' },
  { day: 'Day 2', val: 38, label: 'Oct 16' },
  { day: 'Day 3', val: 30, label: 'Oct 17' },
  { day: 'Day 4', val: 72, label: 'Oct 18' },
  { day: 'Day 5', val: 48, label: 'Oct 19' },
  { day: 'Day 6', val: 20, label: 'Oct 20' },
  { day: 'Day 7', val: 42, label: 'Oct 21' },
  { day: 'Day 8', val: 60, label: 'Oct 22' },
  { day: 'Day 9', val: 32, label: 'Oct 23' },
  { day: 'Day 10', val: 55, label: 'Oct 24' }
];

function AcquisitionVolume() {
  const [hoveredBar, setHoveredBar] = useState(null);

  // SVG parameters
  const svgWidth = 720;
  const svgHeight = 120;
  const maxVal = 80;
  
  // Bar width and spacing
  const barWidth = 42;
  const gap = 24;
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
