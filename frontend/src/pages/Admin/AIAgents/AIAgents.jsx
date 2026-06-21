import React, { useState } from 'react';
import './AIAgents.css';

// Layout and widgets
import AdminSidebar from '../../../components/Admin/AdminDashboard/AdminSidebar';
import SwarmStatCards from '../../../components/Admin/AIAgents/SwarmStatCards';
import AgentsGrid from '../../../components/Admin/AIAgents/AgentsGrid';
import RealtimeStream from '../../../components/Admin/AIAgents/RealtimeStream';

function AIAgents() {
  const [triggerLog, setTriggerLog] = useState(null);

  // Hook up toggle logs to stream feed
  const handleToggleAgentStatus = (agentName, nextStatus) => {
    setTriggerLog({
      module: 'SWARM CONTROLLER',
      type: nextStatus === 'Running' ? 'success' : 'info',
      msg: `Agent "${agentName}" state set to ${nextStatus}.`
    });
  };

  return (
    <div className="admin-dashboard-container">
      {/* Left Sidebar */}
      <AdminSidebar activeTab="ai-agents" />

      {/* Right Content Area */}
      <main className="admin-dashboard-main">
        <div className="admin-subview">
          
          {/* Header Row */}
          <div className="agents-header-row">
            <h1 className="agents-page-title">AI Agents</h1>
            <p className="agents-page-subtitle">
              Manage the AI agents
            </p>
          </div>

          {/* Stats Cards Row */}
          <SwarmStatCards />

          {/* Main Orchestrator Panels */}
          <div className="agents-layout-split">
            {/* Left Column: Grid list of agents */}
            <div className="agents-grid-column">
              <AgentsGrid onToggleAgentStatus={handleToggleAgentStatus} />
            </div>

            {/* Right Column: Live activity stream */}
            <div className="agents-stream-column">
              <RealtimeStream triggerLog={triggerLog} />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default AIAgents;
