import React, { useState, useEffect } from 'react';
import './MonitoringStatus.css';

function MonitoringStatus({ deployments = [] }) {
  const hasDeployments = deployments.length > 0;
  const hasFailed = deployments.some((d) => d.status === 'failed');

  const [cpu, setCpu] = useState(hasDeployments ? 42 : 2);
  const [ram, setRam] = useState(hasDeployments ? 68 : 11);
  const [networkIn, setNetworkIn] = useState(hasDeployments ? 215 : 0);
  const [networkOut, setNetworkOut] = useState(hasDeployments ? 185 : 0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!hasDeployments) {
        setCpu((prev) => {
          const target = 2;
          const change = (Math.random() - 0.5) * 1;
          return Math.max(1, Math.min(5, Math.round(prev + change)));
        });
        setRam((prev) => {
          const target = 11;
          const change = (Math.random() - 0.5) * 0.5;
          return Math.max(9, Math.min(13, Math.round(prev + change)));
        });
        setNetworkIn((prev) => {
          const change = (Math.random() - 0.5) * 0.2;
          return Math.max(0, Math.min(2, Math.round(prev + change)));
        });
        setNetworkOut((prev) => {
          const change = (Math.random() - 0.5) * 0.2;
          return Math.max(0, Math.min(2, Math.round(prev + change)));
        });
      } else {
        setCpu((prev) => {
          const change = (Math.random() - 0.5) * 6; // +/- 3%
          const newVal = Math.round(prev + change);
          return Math.max(10, Math.min(95, newVal));
        });

        setRam((prev) => {
          const change = (Math.random() - 0.5) * 2; // +/- 1%
          const newVal = Math.round(prev + change);
          return Math.max(20, Math.min(99, newVal));
        });

        setNetworkIn((prev) => {
          const change = (Math.random() - 0.5) * 30; // +/- 15 MB/s
          const newVal = Math.round(prev + change);
          return Math.max(50, Math.min(800, newVal));
        });

        setNetworkOut((prev) => {
          const change = (Math.random() - 0.5) * 20; // +/- 10 MB/s
          const newVal = Math.round(prev + change);
          return Math.max(40, Math.min(600, newVal));
        });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [hasDeployments]);

  const getMetricClass = (value, warningThreshold, criticalThreshold) => {
    if (value >= criticalThreshold) return 'critical';
    if (value >= warningThreshold) return 'warning';
    return 'healthy';
  };

  return (
    <section className="widget-card monitoring-status-card">
      <div className="widget-header">
        <div className="widget-header-title">
          <svg className="widget-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
          </svg>
          <h3>Monitoring Status</h3>
        </div>
        <div className="system-health-indicator">
          {hasFailed ? (
            <>
              <span className="health-dot glow-red" style={{ background: '#ef4444', boxShadow: '0 0 8px #ef4444' }}></span>
              <span className="health-text" style={{ color: '#ef4444' }}>System Degraded</span>
            </>
          ) : (
            <>
              <span className="health-dot glow-green"></span>
              <span className="health-text">All Systems Operational</span>
            </>
          )}
        </div>
      </div>

      <div className="metrics-container">
        {/* CPU metric */}
        <div className="metric-row">
          <div className="metric-info-header">
            <span className="metric-title-text">CPU Usage</span>
            <span className={`metric-value-text ${getMetricClass(cpu, 80, 90)}`}>{cpu}%</span>
          </div>
          <div className="metric-bar-bg">
            <div 
              className={`metric-bar-fill ${getMetricClass(cpu, 80, 90)}`} 
              style={{ width: `${cpu}%` }}
            ></div>
          </div>
        </div>

        {/* RAM metric */}
        <div className="metric-row">
          <div className="metric-info-header">
            <span className="metric-title-text">Memory (RAM)</span>
            <span className={`metric-value-text ${getMetricClass(ram, 75, 90)}`}>{ram}%</span>
          </div>
          <div className="metric-bar-bg">
            <div 
              className={`metric-bar-fill ${getMetricClass(ram, 75, 90)}`} 
              style={{ width: `${ram}%` }}
            ></div>
          </div>
        </div>

        {/* Network Metrics */}
        <div className="network-metrics-row">
          <div className="network-box">
            <div className="network-info">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="19 12 12 19 5 12"></polyline>
              </svg>
              <div className="network-texts">
                <span className="network-label">Inbound Traffic</span>
                <span className="network-speed">{networkIn} MB/s</span>
              </div>
            </div>
          </div>
          <div className="network-box">
            <div className="network-info">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2.5">
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
              </svg>
              <div className="network-texts">
                <span className="network-label">Outbound Traffic</span>
                <span className="network-speed">{networkOut} MB/s</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default MonitoringStatus;
