import React, { useState, useEffect, useRef } from 'react';
import './AnalysisLoader.css';

const STATUS_MESSAGES = [
  'Connecting to CloudPilot agent runtime...',
  'Cloning repository (git or tarball fallback)...',
  'Walking repository file tree...',
  'Running deterministic scanners (frameworks, runtime, dependencies)...',
  'Detecting deployment files and CI/CD systems...',
  'Generating AI narrative with local Qwen model...',
  'Finalizing structured analysis report...',
];

function AnalysisLoader({ repoUrl }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [logs, setLogs] = useState([
    { text: `Starting analysis for ${repoUrl}`, time: new Date().toLocaleTimeString(), type: 'info' },
  ]);
  const terminalBodyRef = useRef(null);
  const terminalEndRef = useRef(null);

  useEffect(() => {
    const el = terminalBodyRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    terminalEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, [logs]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => {
        const next = (prev + 1) % STATUS_MESSAGES.length;
        setLogs((current) => {
          const text = STATUS_MESSAGES[next];
          if (current[current.length - 1]?.text === text) {
            return current;
          }
          return [
            ...current,
            {
              text,
              time: new Date().toLocaleTimeString(),
              type: 'success',
            },
          ];
        });
        return next;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [repoUrl]);

  return (
    <div className="analysis-loader-container">
      <div className="loader-hud">
        <div className="hud-radial-wrapper">
          <div className="hud-radial-progress hud-radial-indeterminate">
            <div className="hud-inner-circle">
              <span className="hud-label-text">ANALYZING</span>
            </div>
          </div>
        </div>

        <div className="hud-details">
          <h2 className="hud-title">Repository Analysis In Progress</h2>
          <p className="hud-subtitle">{STATUS_MESSAGES[messageIndex]}</p>
          <p className="hud-subtitle hud-repo-url">{repoUrl}</p>
        </div>
      </div>

      <div className="analysis-terminal">
        <div className="terminal-header">
          <div className="terminal-actions">
            <span className="terminal-dot red"></span>
            <span className="terminal-dot yellow"></span>
            <span className="terminal-dot green"></span>
          </div>
          <span className="terminal-title">cloudpilot-agent@repository-analysis</span>
        </div>
        <div className="terminal-body" ref={terminalBodyRef}>
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
          <div ref={terminalEndRef} className="terminal-scroll-anchor" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

export default AnalysisLoader;
