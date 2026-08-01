import React, { useState, useEffect, useRef } from 'react';
import './AgentWorkflow.css';

const STEPS = [
  {
    id: 'analysis',
    title: 'Code Analysis Agent',
    role: 'STATIC_ANALYSIS_ENGINE',
    description: 'Scans your repository to catalog libraries, parse dependencies, and detect framework entrypoints.',
    badge: 'Scanning Codebase',
    metric: 'Files Scanned: 142/142'
  },
  {
    id: 'platform',
    title: 'Platform & Architecture Agent',
    role: 'HOSTING_PLANNER',
    description: 'Selects the optimal hosting platforms (Vercel, Render, AWS) and maps the network configuration.',
    badge: 'Mapping Architecture',
    metric: 'Reliability Index: 99.98%'
  },
  {
    id: 'cost',
    title: 'Cost Optimization Agent',
    role: 'FINOPS_OPTIMIZER',
    description: 'Builds a multi-provider pricing matrix and dynamically provisions resources to prevent over-allocation.',
    badge: 'Calculating Savings',
    metric: 'Est. Monthly Savings: 84.6%'
  },
  {
    id: 'deploy',
    title: 'Deployment & Verification Agent',
    role: 'DEPLOY_ORCHESTRATOR',
    description: 'Provisions SSL, establishes DNS, deploys containers, and conducts continuous server health checks.',
    badge: 'Verifying Health',
    metric: 'Uptime Status: Active'
  }
];

function AgentWorkflow() {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  
  // Animation-specific states
  const [analysisFile, setAnalysisFile] = useState('package.json');
  const [analysisLogs, setAnalysisLogs] = useState([]);
  const [costSavings, setCostSavings] = useState(0);
  const [deployStage, setDeployStage] = useState(0);

  // Auto-advance loop
  useEffect(() => {
    let timer;
    if (!isHovered) {
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setActiveStep((prevStep) => (prevStep + 1) % STEPS.length);
            return 0;
          }
          return prev + 1.25; // Completes in ~8 seconds (8000ms / 100ms * 1.25 = 100)
        });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [isHovered]);

  // Reset progress on manual switch
  const handleStepClick = (index) => {
    setActiveStep(index);
    setProgress(0);
  };

  // Specific simulation logic for Step 1: Code Analysis
  useEffect(() => {
    if (activeStep !== 0) return;
    const files = ['package.json', 'server.js', 'src/db.js', 'src/auth/jwt.js', 'Dockerfile', 'vite.config.js'];
    const logs = [
      'Scanning root folders...',
      'Detected React frontend + Node.js backend architecture.',
      'Identified libraries: Express, Mongoose, CORS, JSONWebToken.',
      'Analyzing database queries in src/db.js...',
      'Static analysis complete. 0 vulnerabilities found.'
    ];

    let fileIdx = 0;
    let logIdx = 0;
    setAnalysisLogs([logs[0]]);

    const fileInterval = setInterval(() => {
      fileIdx = (fileIdx + 1) % files.length;
      setAnalysisFile(files[fileIdx]);
    }, 1200);

    const logInterval = setInterval(() => {
      if (logIdx < logs.length - 1) {
        logIdx++;
        setAnalysisLogs((prev) => [...prev, logs[logIdx]]);
      }
    }, 1500);

    return () => {
      clearInterval(fileInterval);
      clearInterval(logInterval);
    };
  }, [activeStep]);

  // Specific simulation logic for Step 3: Cost Optimizer
  useEffect(() => {
    if (activeStep !== 2) {
      setCostSavings(0);
      return;
    }
    let start = 0;
    const end = 84;
    const duration = 2000;
    const increment = end / (duration / 50);
    
    const costTimer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCostSavings(end);
        clearInterval(costTimer);
      } else {
        setCostSavings(Math.floor(start));
      }
    }, 50);

    return () => clearInterval(costTimer);
  }, [activeStep]);

  // Specific simulation logic for Step 4: Deployment
  useEffect(() => {
    if (activeStep !== 3) {
      setDeployStage(0);
      return;
    }
    
    const stageTimer = setInterval(() => {
      setDeployStage((prev) => (prev + 1) % 5);
    }, 1800);

    return () => clearInterval(stageTimer);
  }, [activeStep]);

  return (
    <section 
      className="agent-workflow" 
      id="agent-workflow"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setProgress(0);
      }}
    >
      <div className="section-container">
        <div className="workflow-header">
          <span className="workflow-badge">Swarm Intelligence</span>
          <h2 className="workflow-title">AI Agent Swarm in Action</h2>
          <p className="workflow-subtitle">
            Watch our collaborative AI agents analyze your repository, configure optimal infrastructure, minimize hosting cost, and orchestrate zero-downtime deployments.
          </p>
        </div>

        <div className="workflow-grid">
          {/* Left Column: Interactive Stepper */}
          <div className="workflow-stepper">
            {STEPS.map((step, index) => {
              const isActive = index === activeStep;
              return (
                <div 
                  key={step.id} 
                  className={`workflow-step-card ${isActive ? 'active' : ''}`}
                  onClick={() => handleStepClick(index)}
                >
                  <div className="step-card-header">
                    <span className="step-badge">{step.role}</span>
                    <span className="step-index">0{index + 1}</span>
                  </div>
                  <h3 className="step-title">{step.title}</h3>
                  <p className="step-description">{step.description}</p>
                  
                  {/* Progress Line */}
                  <div className="step-progress-bar">
                    <div 
                      className="step-progress-fill" 
                      style={{ width: isActive ? `${progress}%` : '0%' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Dynamic Agent Sandbox */}
          <div className="workflow-sandbox">
            <div className="sandbox-inner">
              {/* Sandbox Top Panel Info */}
              <div className="sandbox-header">
                <div className="header-status">
                  <span className="pulse-dot"></span>
                  <span className="status-label">{STEPS[activeStep].badge}</span>
                </div>
                <div className="header-metric">
                  <code>{STEPS[activeStep].metric}</code>
                </div>
              </div>

              {/* Simulation Screen Wrapper */}
              <div className="sandbox-screen">
                {/* 1. CODE ANALYSIS SIMULATION */}
                {activeStep === 0 && (
                  <div className="sim-code-analysis">
                    <div className="analysis-explorer">
                      <div className="explorer-title">workspace explorer</div>
                      <div className="folder-item">📂 src</div>
                      <div className="folder-item indent">📂 auth</div>
                      <div className={`file-item indent-2 ${analysisFile === 'src/auth/jwt.js' ? 'highlight' : ''}`}>
                        📄 jwt.js
                      </div>
                      <div className="folder-item indent">📂 db</div>
                      <div className={`file-item indent-2 ${analysisFile === 'src/db.js' ? 'highlight' : ''}`}>
                        📄 db.js
                      </div>
                      <div className={`file-item indent ${analysisFile === 'server.js' ? 'highlight' : ''}`}>
                        📄 server.js
                      </div>
                      <div className={`file-item ${analysisFile === 'package.json' ? 'highlight' : ''}`}>
                        📄 package.json
                      </div>
                      <div className={`file-item ${analysisFile === 'Dockerfile' ? 'highlight' : ''}`}>
                        📄 Dockerfile
                      </div>
                    </div>

                    <div className="analysis-viewer">
                      <div className="viewer-tab">
                        <span className="tab-dot font-mono">{analysisFile}</span>
                        <div className="laser-scanner"></div>
                      </div>
                      <div className="code-editor-content">
                        {analysisFile === 'package.json' && (
                          <pre><code>{`{
  "name": "cloudpilot-app",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.0.3",
    "jsonwebtoken": "^9.0.0",
    "cors": "^2.8.5"
  }
}`}</code></pre>
                        )}
                        {analysisFile === 'server.js' && (
                          <pre><code>{`const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.listen(8080, () => {
  console.log('Server online');
});`}</code></pre>
                        )}
                        {analysisFile === 'src/db.js' && (
                          <pre><code>{`const mongoose = require('mongoose');

async function connect() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB Connected');
}`}</code></pre>
                        )}
                        {!(analysisFile === 'package.json' || analysisFile === 'server.js' || analysisFile === 'src/db.js') && (
                          <pre><code>{`// Parsing configuration file...
// Checking for security leaks...
// Verifying modules and assets...
// Extracting environment targets...`}</code></pre>
                        )}
                      </div>
                      <div className="terminal-log-panel">
                        {analysisLogs.map((log, idx) => (
                          <div key={idx} className="terminal-log-line">
                            <span className="log-arrow">&gt;</span> {log}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. PLATFORM & ARCHITECTURE SELECTION SIMULATION */}
                {activeStep === 1 && (
                  <div className="sim-platform-arch">
                    <div className="arch-canvas">
                      {/* Source Node */}
                      <div className="arch-node node-source">
                        <div className="node-icon">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                          </svg>
                        </div>
                        <span className="node-label">Your GitHub Repo</span>
                      </div>

                      {/* Connection Lines (animated data flow) */}
                      <svg className="connections-overlay" width="100%" height="100%">
                        <path d="M 120 140 Q 220 140 310 140" className="flow-path path-main" />
                        <path d="M 330 140 Q 420 80 480 80" className="flow-path path-vercel" />
                        <path d="M 330 140 Q 420 140 480 140" className="flow-path path-render" />
                        <path d="M 330 140 Q 420 200 480 200" className="flow-path path-aws" />
                      </svg>

                      {/* Central Orchestrator */}
                      <div className="arch-node node-orchestrator pulse-glow">
                        <div className="node-icon">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                            <polyline points="2 17 12 22 22 17"></polyline>
                            <polyline points="2 12 12 17 22 12"></polyline>
                          </svg>
                        </div>
                        <span className="node-label">CloudPilot Parser</span>
                      </div>

                      {/* Destination Targets */}
                      <div className="destinations-column">
                        <div className="arch-node node-dest selected">
                          <span className="dest-badge vercel">Frontend</span>
                          <span className="node-label-small">Vercel (Static Web)</span>
                          <span className="check-indicator">✓</span>
                        </div>
                        <div className="arch-node node-dest selected">
                          <span className="dest-badge render">Backend</span>
                          <span className="node-label-small">Render (Web Service)</span>
                          <span className="check-indicator">✓</span>
                        </div>
                        <div className="arch-node node-dest idle-node">
                          <span className="dest-badge aws">Cluster</span>
                          <span className="node-label-small">AWS ECS (Alternative)</span>
                          <span className="check-indicator-idle">-</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. COST OPTIMIZATION SIMULATION */}
                {activeStep === 2 && (
                  <div className="sim-cost-optimizer">
                    <div className="cost-panel-grid">
                      <div className="cost-chart-box">
                        <div className="chart-bar-container">
                          <div className="chart-bar bar-red" style={{ height: '85%' }}>
                            <div className="bar-label">$156/mo</div>
                          </div>
                          <span className="bar-title">Unoptimized Cloud</span>
                        </div>
                        
                        <div className="chart-bar-container">
                          <div className="chart-bar bar-green animate-height" style={{ height: '15%' }}>
                            <div className="bar-label">$24/mo</div>
                          </div>
                          <span className="bar-title">CloudPilot Swarm</span>
                        </div>
                      </div>

                      <div className="cost-savings-breakdown">
                        <div className="savings-title-glow">
                          <span className="savings-pct">{costSavings}%</span> Saved
                        </div>
                        <div className="savings-details-card">
                          <div className="detail-item">
                            <span className="lbl">Pruning Idle Resources</span>
                            <span className="val green">-$42.00</span>
                          </div>
                          <div className="detail-item">
                            <span className="lbl">Database Quota Scaling</span>
                            <span className="val green">-$68.00</span>
                          </div>
                          <div className="detail-item">
                            <span className="lbl">Static Assets off Server</span>
                            <span className="val green">-$22.00</span>
                          </div>
                          <div className="divider-line"></div>
                          <div className="detail-item total">
                            <span className="lbl font-bold">Estimated Savings</span>
                            <span className="val green font-bold">+$132.00/mo</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. DEPLOYMENT & VERIFICATION SIMULATION */}
                {activeStep === 3 && (
                  <div className="sim-deployment">
                    <div className="deploy-steps-timeline">
                      <div className={`timeline-node ${deployStage >= 0 ? 'completed' : ''} ${deployStage === 0 ? 'current' : ''}`}>
                        <div className="step-num-circle">1</div>
                        <span className="step-lbl">Build Container</span>
                      </div>
                      <div className="timeline-connector"></div>
                      <div className={`timeline-node ${deployStage >= 1 ? 'completed' : ''} ${deployStage === 1 ? 'current' : ''}`}>
                        <div className="step-num-circle">2</div>
                        <span className="step-lbl">Secure SSL</span>
                      </div>
                      <div className="timeline-connector"></div>
                      <div className={`timeline-node ${deployStage >= 2 ? 'completed' : ''} ${deployStage === 2 ? 'current' : ''}`}>
                        <div className="step-num-circle">3</div>
                        <span className="step-lbl">DNS Routing</span>
                      </div>
                      <div className="timeline-connector"></div>
                      <div className={`timeline-node ${deployStage >= 3 ? 'completed' : ''} ${deployStage === 3 ? 'current' : ''}`}>
                        <div className="step-num-circle">4</div>
                        <span className="step-lbl">Health Check</span>
                      </div>
                    </div>

                    <div className="deploy-terminal">
                      <div className="deploy-terminal-header">
                        <span>deployment pipeline output</span>
                      </div>
                      <div className="deploy-terminal-body">
                        {deployStage >= 0 && (
                          <div className="term-line success">✓ Build complete. Docker image size: 142MB</div>
                        )}
                        {deployStage >= 1 && (
                          <div className="term-line success">✓ Let's Encrypt SSL certificate successfully issued.</div>
                        )}
                        {deployStage >= 2 && (
                          <div className="term-line success">✓ Route CNAME points to edge load balancers.</div>
                        )}
                        {deployStage >= 3 && (
                          <div className="term-line success info-pulse">ℹ Testing production endpoints: https://cp-app-prod.render.com...</div>
                        )}
                        {deployStage >= 4 && (
                          <div className="term-line success bold-live">✓ DEPLOYMENT VERIFIED: Endpoint returned 200 OK. Application is active.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AgentWorkflow;
