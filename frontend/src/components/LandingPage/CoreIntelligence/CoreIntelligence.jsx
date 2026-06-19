import React from 'react';
import './CoreIntelligence.css';
import deepAiScanIcon from '../../../assets/deep-ai-scan.svg';
import autoDeployIcon from '../../../assets/auto-deploy.svg';
import selfHealingIcon from '../../../assets/self-healing.svg';
import lineGraphic from '../../../assets/decorative-connecting-lines.svg';

function CoreIntelligence() {
  return (
    <section className="core-intelligence" id="core-intelligence">
      <div className="section-container">
        <h2 className="section-title-label">Core Intelligence</h2>
        <p className="section-subtitle">Engineered for high-density environments.</p>
        
        <div className="grid-container">
          {/* Card 1: Deep AI Scan (Wide) */}
          <div className="card card-wide card-deep-ai">
            <div className="card-header">
              <img src={deepAiScanIcon} alt="Deep AI Scan" className="card-icon" />
              <h3 className="card-title">Deep AI Scan</h3>
              <span className="card-badge-dot"></span>
            </div>
            <p className="card-description">
              Real-time behavioral analysis of your microservices. CloudPilot identifies latent inefficiencies and resource leaks with 99.9% accuracy.
            </p>
            <div className="terminal-window">
              <div className="terminal-header">
                <span className="terminal-title">terminal output</span>
              </div>
              <div className="terminal-body">
                <div className="terminal-line"><span className="time">09:42:12</span> <span className="tag-scan">[SCAN]</span> Analyzing pod-a2-west...</div>
                <div className="terminal-line alert"><span className="time">09:42:15</span> <span className="tag-alert">[ALERT]</span> High latency detected in auth-service.</div>
                <div className="terminal-line exec"><span className="time">09:42:16</span> <span className="tag-exec">[EXEC]</span> Applying load balancer redistribution.</div>
                <div className="terminal-line ok"><span className="time">09:42:18</span> <span className="tag-ok">[OK]</span> System stabilized.</div>
              </div>
            </div>
          </div>

          {/* Card 2: Auto-Deploy (Narrow) */}
          <div className="card card-narrow card-auto-deploy">
            <div className="card-header">
              <img src={autoDeployIcon} alt="Auto-Deploy" className="card-icon" />
              <h3 className="card-title">Auto-Deploy</h3>
            </div>
            <p className="card-description">
              Git-integrated pipelines that understand your architecture. Zero-downtime, blue-green deployments by default.
            </p>
            <div className="deploy-graphic">
              <div className="deploy-bar">
                <div className="deploy-progress"></div>
              </div>
            </div>
          </div>

          {/* Card 3: Self-Healing (Narrow) */}
          <div className="card card-narrow card-self-healing">
            <div className="card-header">
              <img src={selfHealingIcon} alt="Self-Healing" className="card-icon" />
              <h3 className="card-title">Self-Healing</h3>
            </div>
            <p className="card-description">
              Automated incident response. CloudPilot restarts services, adjusts quotas, and reroutes traffic automatically during failures.
            </p>
          </div>

          {/* Card 4: Cloud Agnostic Cluster (Wide) */}
          <div className="card card-wide card-agnostic">
            <div className="agnostic-content">
              <h3 className="card-title">Cloud Agnostic Cluster</h3>
              <p className="card-description">
                Connect AWS, GCP, Azure, and private clouds into a single coherent management plane. Shift workloads between providers with zero config changes.
              </p>
              <a href="#platforms" className="card-link">
                VIEW SUPPORTED PLATFORMS <span className="arrow">→</span>
              </a>
            </div>
            <div className="agnostic-graphic">
              <img src={lineGraphic} alt="" className="agnostic-line-bg" />
              <div className="cluster-nodes">
                <div className="node node-left">
                  <div className="node-icon icon-cloud"></div>
                </div>
                <div className="node node-center">
                  <div className="node-icon icon-central"></div>
                </div>
                <div className="node node-right">
                  <div className="node-icon icon-db"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CoreIntelligence;
