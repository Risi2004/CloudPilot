import React from 'react';
import './ArchitectureDiagram.css';

const TYPE_COLORS = {
  frontend: '#00d4ff',
  backend: '#a855f7',
  database: '#10b981',
  worker: '#fbbf24',
  default: '#64748b',
};

function ArchitectureDiagram({ blueprint }) {
  const inventory = blueprint?.service_inventory || [];
  const dependencies = blueprint?.service_dependencies || [];

  if (!inventory.length) {
    return (
      <div className="diag-wrapper">
        <p className="diag-empty">No service topology available.</p>
      </div>
    );
  }

  const nodeWidth = 140;
  const nodeHeight = 56;
  const cols = Math.min(3, inventory.length);
  const rows = Math.ceil(inventory.length / cols);
  const svgWidth = cols * (nodeWidth + 40) + 40;
  const svgHeight = rows * (nodeHeight + 60) + 60;

  const positions = {};
  inventory.forEach((svc, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    positions[svc.id] = {
      x: 40 + col * (nodeWidth + 40),
      y: 40 + row * (nodeHeight + 60),
    };
  });

  return (
    <div className="diag-wrapper">
      <div className="diag-title-row">
        <h3 className="diag-title">Service Topology</h3>
        <span className="diag-badge font-mono">DEPLOYMENT ARCHITECTURE</span>
      </div>

      <div className="diag-canvas">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" className="diag-svg">
          {dependencies.map((dep, idx) => {
            const fromId = dep.from || dep.from_service;
            const toId = dep.to || dep.to_service;
            const from = positions[fromId];
            const to = positions[toId];
            if (!from || !to) return null;
            const x1 = from.x + nodeWidth / 2;
            const y1 = from.y + nodeHeight;
            const x2 = to.x + nodeWidth / 2;
            const y2 = to.y;
            return (
              <line
                key={idx}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(0, 212, 255, 0.4)"
                strokeWidth="1.5"
                markerEnd="url(#arrowhead)"
              />
            );
          })}

          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
              <polygon points="0 0, 6 2, 0 4" fill="rgba(0, 212, 255, 0.6)" />
            </marker>
          </defs>

          {inventory.map((svc) => {
            const pos = positions[svc.id];
            const color = TYPE_COLORS[svc.type] || TYPE_COLORS.default;
            return (
              <g key={svc.id}>
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={nodeWidth}
                  height={nodeHeight}
                  rx="8"
                  fill="rgba(5, 20, 36, 0.85)"
                  stroke={color}
                  strokeWidth="1.5"
                />
                <text x={pos.x + nodeWidth / 2} y={pos.y + 22} fill="#ffffff" fontSize="11" fontWeight="700" textAnchor="middle">
                  {svc.name?.slice(0, 18)}
                </text>
                <text x={pos.x + nodeWidth / 2} y={pos.y + 38} fill={color} fontSize="9" textAnchor="middle">
                  {svc.type} · {svc.platform}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default ArchitectureDiagram;
