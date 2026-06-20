import React, { useState, useEffect } from 'react';
import './AnalysisLoader.css';

function AnalysisLoader({ repoUrl, onComplete }) {
  const [logs, setLogs] = useState([]);
  const [percent, setPercent] = useState(0);

  const logMessages = [
    { text: 'Initializing CloudPilot multi-agent engine...', delay: 200 },
    { text: 'Connecting to secure GitHub gateway...', delay: 500 },
    { text: 'Accessing repository: ' + repoUrl, delay: 900 },
    { text: 'Cloning source tree into sandbox workspace...', delay: 1400 },
    { text: 'Indexing file structures & directory nodes...', delay: 2000 },
    { text: 'Scanning configuration files (package.json, requirements.txt, pom.xml)...', delay: 2500 },
    { text: 'Detecting codebase language runtimes and frameworks...', delay: 3100 },
    { text: 'Analyzing code blocks for external APIs & integrations...', delay: 3800 },
    { text: 'Detecting payment gateways, DB adaptors, and mail channels...', delay: 4300 },
    { text: 'Synthesizing containerization recommendations (Dockerfile recipe)...', delay: 4800 },
    { text: 'Assembling cloud architecture blueprints & infrastructure costs...', delay: 5400 },
    { text: 'Compiling analysis reports & telemetry metrics...', delay: 6000 }
  ];

  useEffect(() => {
    let currentLogIndex = 0;
    const logTimers = [];

    // Log messages push loop
    logMessages.forEach((msg, idx) => {
      const timer = setTimeout(() => {
        setLogs(prev => [...prev, {
          text: msg.text,
          time: new Date().toLocaleTimeString(),
          type: msg.text.startsWith('Accessing') || msg.text.startsWith('Indexing') ? 'info' : 'success'
        }]);
      }, msg.delay);
      logTimers.push(timer);
    });

    // Percentage counter
    const progressTimer = setInterval(() => {
      setPercent(prev => {
        if (prev >= 100) {
          clearInterval(progressTimer);
          return 100;
        }
        return prev + 1;
      });
    }, 62);

    // Call onComplete after logs complete
    const completionTimer = setTimeout(() => {
      onComplete();
    }, 6800);

    return () => {
      logTimers.forEach(clearTimeout);
      clearInterval(progressTimer);
      clearTimeout(completionTimer);
    };
  }, []);

  return (
    <div className="analysis-loader-container">
      <div className="loader-hud">
        {/* Core HUD circle loader */}
        <div className="hud-radial-wrapper">
          <div className="hud-radial-progress" style={{ '--percent': percent }}>
            <div className="hud-inner-circle">
              <span className="hud-percent-text">{percent}%</span>
              <span className="hud-label-text">SCANNING</span>
            </div>
          </div>
        </div>

        {/* HUD Details */}
        <div className="hud-details">
          <h2 className="hud-title">Autonomous Code Audit</h2>
          <p className="hud-subtitle">Analyzing system files, payment gateways, and package dependencies.</p>
        </div>
      </div>

      {/* Terminal logs panel */}
      <div className="analysis-terminal">
        <div className="terminal-header">
          <div className="terminal-actions">
            <span className="terminal-dot red"></span>
            <span className="terminal-dot yellow"></span>
            <span className="terminal-dot green"></span>
          </div>
          <span className="terminal-title">cloudpilot-agent@audit:~</span>
        </div>
        <div className="terminal-body">
          {logs.map((log, index) => (
            <div key={index} className="terminal-line">
              <span className="line-timestamp">[{log.time}]</span>
              <span className={`line-content ${log.type}`}> {log.text}</span>
            </div>
          ))}
          <div className="terminal-cursor-line">
            <span className="line-timestamp">[{new Date().toLocaleTimeString()}]</span>
            <span className="terminal-cursor"> █</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalysisLoader;
