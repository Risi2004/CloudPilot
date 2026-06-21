import React, { useState, useRef, useEffect } from 'react';
import './RealtimeStream.css';

const INITIAL_LOGS = [
  { id: 1, time: '09:47:31', module: 'ARCHITECTURE', type: 'info', msg: 'Refactoring VPC peering logic for better isolation.' },
  { id: 2, time: '09:47:31', module: 'ARCHITECTURE', type: 'info', msg: 'Refactoring VPC peering logic for better isolation.' },
  { id: 3, time: '09:47:30', module: 'INCIDENT', type: 'alert', msg: 'Critical: Database connection pool exhausted.' },
  { id: 4, time: '09:47:30', module: 'COST OPT.', type: 'success', msg: 'Identified $420/mo savings by migrating to graviton3.' }
];

function RealtimeStream({ triggerLog }) {
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [commandInput, setCommandInput] = useState('');
  const logsEndRef = useRef(null);

  // Scroll to bottom on new log
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Listen to external toggle events from parent page
  useEffect(() => {
    if (triggerLog) {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      const newLog = {
        id: Date.now(),
        time: timeStr,
        module: triggerLog.module,
        type: triggerLog.type,
        msg: triggerLog.msg
      };
      setLogs((prev) => [...prev, newLog]);
    }
  }, [triggerLog]);

  const handleCommandSubmit = (e) => {
    e.preventDefault();
    if (!commandInput.trim()) return;

    const cmd = commandInput.trim();
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    // Append user log
    const userLog = {
      id: Date.now(),
      time: timeStr,
      module: 'USER COMMAND',
      type: 'user',
      msg: `Executed: "${cmd}"`
    };

    setLogs((prev) => [...prev, userLog]);
    setCommandInput('');

    // Simulate agent response
    setTimeout(() => {
      let responseLogs = [];
      const cmdLower = cmd.toLowerCase();

      if (cmdLower.includes('cost') || cmdLower.includes('optimize')) {
        responseLogs = [
          { id: Date.now() + 1, time: timeStr, module: 'COST OPT.', type: 'info', msg: 'Scanning EC2/RDS resource pools for optimization targets...' },
          { id: Date.now() + 2, time: timeStr, module: 'COST OPT.', type: 'success', msg: 'Terminated 2 idle development containers. Saved $78/mo.' }
        ];
      } else if (cmdLower.includes('security') || cmdLower.includes('scan')) {
        responseLogs = [
          { id: Date.now() + 1, time: timeStr, module: 'SECURITY', type: 'info', msg: 'Initiating full cluster SAST security scan...' },
          { id: Date.now() + 2, time: timeStr, module: 'SECURITY', type: 'success', msg: 'Scan complete. 0 critical vulnerabilities found, 2 dependencies updated.' }
        ];
      } else if (cmdLower.includes('architecture') || cmdLower.includes('vpc')) {
        responseLogs = [
          { id: Date.now() + 1, time: timeStr, module: 'ARCHITECTURE', type: 'info', msg: 'Analyzing VPC peering configuration routes...' },
          { id: Date.now() + 2, time: timeStr, module: 'ARCHITECTURE', type: 'info', msg: 'Rerouted cross-region traffic lines to improve reliability index.' }
        ];
      } else {
        responseLogs = [
          { id: Date.now() + 1, time: timeStr, module: 'SWARM CONTROLLER', type: 'info', msg: `Command acknowledged. Swarm active thread count: 9.` }
        ];
      }

      setLogs((prev) => [...prev, ...responseLogs]);
    }, 800);
  };

  return (
    <div className="stream-panel-card">
      {/* Panel Header */}
      <div className="stream-header">
        <div className="stream-header-left">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" className="stream-icon">
            <polyline points="4 17 10 11 4 5"></polyline>
            <line x1="12" y1="19" x2="20" y2="19"></line>
          </svg>
          <span className="stream-title">Real-time Stream</span>
        </div>
        <div className="live-status-badge">
          <span className="live-dot" />
          <span className="live-text">LIVE</span>
        </div>
      </div>

      {/* Log Feed Display */}
      <div className="stream-log-display">
        {logs.map((log) => (
          <div key={log.id} className="log-row">
            <span className="log-timestamp">[{log.time}]</span>
            <span className={`log-module-badge ${log.type}`}>
              {log.module}
            </span>
            <span className="log-message">{log.msg}</span>
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>

      {/* Command Swarm Console Input */}
      <form onSubmit={handleCommandSubmit} className="stream-console-form">
        <span className="console-prompt">&gt;</span>
        <input
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          placeholder="Command swarm..."
          className="console-input"
        />
      </form>
    </div>
  );
}

export default RealtimeStream;
