import React, { useState } from 'react';
import './AgentsGrid.css';

const INITIAL_AGENTS = [
  {
    id: 'code-analysis',
    name: 'Code Analysis',
    status: 'Running',
    latency: '85ms',
    throughput: '1.2k',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"></polyline>
        <polyline points="8 6 2 12 8 18"></polyline>
      </svg>
    )
  },
  {
    id: 'platform-selection',
    name: 'Platform Selection',
    status: 'Running',
    latency: '210ms',
    throughput: '432',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <circle cx="6" cy="6" r="3"></circle>
        <circle cx="18" cy="6" r="3"></circle>
        <circle cx="18" cy="18" r="3"></circle>
        <circle cx="6" cy="18" r="3"></circle>
        <line x1="12" y1="9" x2="6" y2="6"></line>
        <line x1="12" y1="9" x2="18" y2="6"></line>
        <line x1="12" y1="15" x2="18" y2="18"></line>
        <line x1="12" y1="15" x2="6" y2="18"></line>
      </svg>
    )
  },
  {
    id: 'architecture',
    name: 'Architecture',
    status: 'Idle',
    latency: '450ms',
    throughput: '89',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9"></rect>
        <rect x="14" y="3" width="7" height="5"></rect>
        <rect x="14" y="12" width="7" height="9"></rect>
        <rect x="3" y="16" width="7" height="5"></rect>
      </svg>
    )
  },
  {
    id: 'cost-optimization',
    name: 'Cost Optimization',
    status: 'Running',
    latency: '112ms',
    throughput: '2.4k',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"></line>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
      </svg>
    )
  },
  {
    id: 'deployment',
    name: 'Deployment',
    status: 'Running',
    latency: '320ms',
    throughput: '156',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 16.5c-1.5 1.26-2.5 3.19-2.5 5.5h20c0-2.31-1-4.24-2.5-5.5"></path>
        <path d="M12 2C7.58 2 4 5.58 4 10c0 4.09 2.91 7.5 7 8.19V20h2v-1.81c4.09-.69 7-4.1 7-8.19 0-4.42-3.58-8-8-8z"></path>
      </svg>
    )
  },
  {
    id: 'monitoring',
    name: 'Monitoring',
    status: 'Running',
    latency: '45ms',
    throughput: '8.9k',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18"></path>
        <polyline points="18.7 8 13 14 9 10 5.3 14.7"></polyline>
      </svg>
    )
  },
  {
    id: 'incident-response',
    name: 'Incident Response',
    status: 'Idle',
    latency: '-',
    throughput: '12',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    )
  },
  {
    id: 'security',
    name: 'Security',
    status: 'Running',
    latency: '92ms',
    throughput: '5.1k',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      </svg>
    )
  },
  {
    id: 'documentation',
    name: 'Documentation',
    status: 'Running',
    latency: '800ms',
    throughput: '210',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    )
  }
];

function AgentsGrid({ onToggleAgentStatus }) {
  const [agents, setAgents] = useState(INITIAL_AGENTS);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  const toggleAgent = (id) => {
    const updated = agents.map((agent) => {
      if (agent.id === id) {
        const nextStatus = agent.status === 'Running' ? 'Idle' : 'Running';
        const nextLatency = nextStatus === 'Idle' ? (agent.id === 'incident-response' ? '-' : '300ms') : (agent.id === 'incident-response' ? '500ms' : agent.latency);
        const nextThroughput = nextStatus === 'Idle' ? '0' : agent.throughput;
        
        // Notify parent layout if needed (to push logs, etc.)
        if (onToggleAgentStatus) {
          onToggleAgentStatus(agent.name, nextStatus);
        }

        return {
          ...agent,
          status: nextStatus,
          // Store a placeholder change for latency / throughput when idle
          tempLatency: nextLatency,
          tempThroughput: nextThroughput
        };
      }
      return agent;
    });
    setAgents(updated);
  };

  return (
    <div className="agents-panel-card">
      <div className="panel-header-row">
        <h3 className="panel-title">Active Agents</h3>
        
        <div className="view-switcher-buttons">
          {/* Grid View Switcher */}
          <button 
            className={`switcher-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </button>
          
          {/* List View Switcher */}
          <button 
            className={`switcher-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List View"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <div className={`agents-display-container ${viewMode}`}>
        {agents.map((agent) => {
          const isRunning = agent.status === 'Running';
          const displayedLatency = agent.tempLatency !== undefined ? agent.tempLatency : agent.latency;
          const displayedThroughput = agent.tempThroughput !== undefined ? agent.tempThroughput : agent.throughput;

          return (
            <div key={agent.id} className={`agent-card-item ${isRunning ? 'running' : 'idle'}`}>
              <div className="agent-card-top">
                <div className={`agent-icon-box ${isRunning ? 'blue' : 'gray'}`}>
                  {agent.icon}
                </div>
                
                {/* Toggle switch slider */}
                <label className="agent-toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={isRunning}
                    onChange={() => toggleAgent(agent.id)}
                  />
                  <span className="agent-toggle-slider" />
                </label>
              </div>

              <div className="agent-card-info">
                <h4 className="agent-card-name">{agent.name}</h4>
                <div className="agent-status-label">
                  <span className={`status-indicator-dot ${isRunning ? 'active' : 'inactive'}`} />
                  <span className="status-indicator-text">{agent.status}</span>
                </div>
              </div>

              <div className="agent-card-metrics">
                <div className="metric-box">
                  <span className="metric-lbl">LATENCY</span>
                  <span className="metric-val">{displayedLatency}</span>
                </div>
                <div className="metric-box">
                  <span className="metric-lbl">THROUGHPUT</span>
                  <span className="metric-val">{displayedThroughput}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AgentsGrid;
