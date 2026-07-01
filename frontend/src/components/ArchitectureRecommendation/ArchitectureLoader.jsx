import React, { useState, useEffect } from 'react';
import './ArchitectureLoader.css';

const STATUS_MESSAGES = [
  'Loading repository analysis and platform selection sessions...',
  'Analyzing application components from scan facts...',
  'Retrieving deployment documentation from knowledge base...',
  'Designing service topology and platform assignments...',
  'Generating deployment blueprint with local Qwen model...',
  'Finalizing environment plan and dependency graph...',
];

function ArchitectureLoader({ repoUrl }) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="arch-loader-wrapper">
      <div className="arch-loader-card">
        <span className="arch-loader-badge font-mono">ARCHITECTURE AGENT</span>
        <h2 className="arch-loader-title">Generating Deployment Blueprint</h2>
        <p className="arch-loader-repo">{repoUrl}</p>
        <div className="arch-loader-spinner" />
        <p className="arch-loader-status">{STATUS_MESSAGES[messageIndex]}</p>
        <p className="arch-loader-hint">This may take 30–90 seconds depending on project complexity.</p>
      </div>
    </div>
  );
}

export default ArchitectureLoader;
