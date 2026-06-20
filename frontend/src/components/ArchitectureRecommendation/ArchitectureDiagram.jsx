import React from 'react';
import './ArchitectureDiagram.css';

function ArchitectureDiagram({ data }) {
  return (
    <div className="diag-wrapper">
      <div className="diag-title-row">
        <h3 className="diag-title">Virtual Network & Service Diagram</h3>
        <span className="diag-badge font-mono">AWS VPC TOPOLOGY (US-EAST-1)</span>
      </div>

      <div className="diag-canvas">
        <svg viewBox="0 0 820 480" width="100%" height="100%" className="diag-svg">
          {/* Definitions for gradients and shadows */}
          <defs>
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="grad-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0082ff" stopOpacity="0.03" />
            </linearGradient>
            <linearGradient id="grad-purple" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.03" />
            </linearGradient>
            <linearGradient id="grad-green" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          {/* VPC Boundary Group */}
          <rect x="20" y="20" width="780" height="440" rx="16" fill="rgba(8, 17, 32, 0.4)" stroke="rgba(0, 212, 255, 0.2)" strokeWidth="1.5" />
          <text x="35" y="44" fill="#64748b" fontSize="11" fontWeight="700" letterSpacing="0.05em">AWS VIRTUAL PRIVATE CLOUD (VPC) - 10.0.0.0/16</text>

          {/* INGRESS GROUP (Internet gateway / ALB) */}
          {/* Internet node */}
          <circle cx="80" cy="240" r="24" fill="rgba(255, 255, 255, 0.03)" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" />
          <text x="80" y="243" fill="#cbd5e1" fontSize="10" fontWeight="700" textAnchor="middle">INTERNET</text>

          {/* Connect: Internet -> ALB */}
          <path d="M104 240 L190 240" stroke="#00d4ff" strokeWidth="1.5" strokeDasharray="4 4" />
          <circle cx="147" cy="240" r="4" fill="#00d4ff" filter="url(#glow-cyan)" />

          {/* Ingress Subnet Boundary */}
          <rect x="190" y="80" width="140" height="320" rx="10" fill="url(#grad-cyan)" stroke="rgba(0, 212, 255, 0.15)" strokeWidth="1" />
          <text x="200" y="102" fill="#00d4ff" fontSize="9" fontWeight="700" letterSpacing="0.05em">PUBLIC SUBNETS</text>

          {/* ALB instance */}
          <rect x="210" y="200" width="100" height="80" rx="8" fill="rgba(5, 20, 36, 0.85)" stroke="#00d4ff" strokeWidth="1.5" />
          <text x="260" y="235" fill="#ffffff" fontSize="12" fontWeight="700" textAnchor="middle">ALB</text>
          <text x="260" y="252" fill="#64748b" fontSize="9" textAnchor="middle">Load Balancer</text>

          {/* Connects: ALB -> App servers */}
          <path d="M310 240 L380 180" stroke="rgba(0, 212, 255, 0.4)" strokeWidth="1.5" />
          <path d="M310 240 L380 300" stroke="rgba(0, 212, 255, 0.4)" strokeWidth="1.5" />

          {/* APP SERVER GROUP (ECS / Fargate containers) */}
          <rect x="380" y="80" width="220" height="320" rx="10" fill="url(#grad-purple)" stroke="rgba(168, 85, 247, 0.15)" strokeWidth="1" />
          <text x="390" y="102" fill="#a855f7" fontSize="9" fontWeight="700" letterSpacing="0.05em">PRIVATE APP SUBNETS</text>

          {/* App server 1 */}
          <rect x="400" y="130" width="180" height="90" rx="8" fill="rgba(5, 20, 36, 0.85)" stroke="#a855f7" strokeWidth="1.5" />
          <text x="490" y="165" fill="#ffffff" fontSize="12" fontWeight="700" textAnchor="middle">CONTAINER TASK (AZ1)</text>
          <text x="490" y="182" fill="#94a3b8" fontSize="10" textAnchor="middle">App Execution Node</text>
          <text x="490" y="198" fill="#a855f7" fontSize="9" fontWeight="700" textAnchor="middle">ACTIVE</text>

          {/* App server 2 */}
          <rect x="400" y="250" width="180" height="90" rx="8" fill="rgba(5, 20, 36, 0.85)" stroke="#a855f7" strokeWidth="1.5" />
          <text x="490" y="285" fill="#ffffff" fontSize="12" fontWeight="700" textAnchor="middle">CONTAINER TASK (AZ2)</text>
          <text x="490" y="302" fill="#94a3b8" fontSize="10" textAnchor="middle">App Execution Node</text>
          <text x="490" y="318" fill="#a855f7" fontSize="9" fontWeight="700" textAnchor="middle">STANDBY</text>

          {/* Connects: Containers -> Database */}
          <path d="M580 175 L670 240" stroke="rgba(16, 185, 129, 0.4)" strokeWidth="1.5" />
          <path d="M580 295 L670 240" stroke="rgba(16, 185, 129, 0.4)" strokeWidth="1.5" />

          {/* DATA GROUP (RDS SQL / Redis cache) */}
          <rect x="650" y="80" width="130" height="320" rx="10" fill="url(#grad-green)" stroke="rgba(16, 185, 129, 0.15)" strokeWidth="1" />
          <text x="660" y="102" fill="#10b981" fontSize="9" fontWeight="700" letterSpacing="0.05em">ISOLATED DB</text>

          {/* SQL instance */}
          <rect x="665" y="190" width="100" height="100" rx="8" fill="rgba(5, 20, 36, 0.85)" stroke="#10b981" strokeWidth="1.5" />
          <text x="715" y="235" fill="#ffffff" fontSize="12" fontWeight="700" textAnchor="middle">DATABASE</text>
          <text x="715" y="252" fill="#64748b" fontSize="9" textAnchor="middle">RDS PostgreSQL</text>
          <text x="715" y="268" fill="#10b981" fontSize="9" fontWeight="700" textAnchor="middle">PRIMARY</text>

          {/* Subnet Labels / Legends */}
          <text x="35" y="440" fill="#475569" fontSize="9" fontWeight="600">CLOUD PILOT TOPOLOGY SCANNER V1.2.0 • REGION: US-EAST-1</text>
        </svg>
      </div>
    </div>
  );
}

export default ArchitectureDiagram;
