import React, { useState } from 'react';
import './AdminDashboard.css';

// Admin Components
import AdminSidebar from '../../../components/Admin/AdminDashboard/AdminSidebar';
import AdminHeader from '../../../components/Admin/AdminDashboard/AdminHeader';
import StatCards from '../../../components/Admin/AdminDashboard/StatCards';
import GPUChart from '../../../components/Admin/AdminDashboard/GPUChart';
import CloudHealth from '../../../components/Admin/AdminDashboard/CloudHealth';
import RecentEvents from '../../../components/Admin/AdminDashboard/RecentEvents';

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Render main dashboard view
  const renderDashboardView = () => (
    <div className="admin-dashboard-view">
      <AdminHeader />
      <StatCards />
      
      {/* Middle row: Chart and Cloud Health */}
      <div className="admin-dashboard-mid-row">
        <div className="mid-col-chart">
          <GPUChart />
        </div>
        <div className="mid-col-health">
          <CloudHealth />
        </div>
      </div>
      
      {/* Bottom row: Events Table */}
      <div className="admin-dashboard-bottom-row">
        <RecentEvents onViewAllLogs={() => setActiveTab('audit-logs')} />
      </div>
    </div>
  );

  // Subview: Users Management
  const renderUsersView = () => (
    <div className="admin-subview">
      <div className="subview-header">
        <div>
          <h2 className="subview-title">Users Management</h2>
          <p className="subview-subtitle">Monitor registered accounts, billing statuses, and access credentials.</p>
        </div>
        <div className="subview-actions">
          <input 
            type="text" 
            placeholder="Search users..." 
            className="admin-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="admin-action-btn primary">+ Add User</button>
        </div>
      </div>
      
      <div className="admin-card table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>USER</th>
              <th>TIER</th>
              <th>CONNECTED REPOS</th>
              <th>STATUS</th>
              <th>JOINED</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'Xander King', email: 'xander@skynet.io', tier: 'Pro Plan', repos: 14, status: 'Active', joined: 'Mar 12, 2026' },
              { name: 'Sarah Miller', email: 'sarah.m@gmail.com', tier: 'Free Tier', repos: 2, status: 'Active', joined: 'Apr 02, 2026' },
              { name: 'Marcus Chen', email: 'mchen@tesla.com', tier: 'Enterprise', repos: 48, status: 'Active', joined: 'Jan 15, 2026' },
              { name: 'Emily Watson', email: 'emily@devops.co', tier: 'Pro Plan', repos: 8, status: 'Suspended', joined: 'May 20, 2026' }
            ]
            .filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((user, idx) => (
              <tr key={idx}>
                <td>
                  <div className="table-user-cell">
                    <span className="user-initials-bubble">{user.name.split(' ').map(n => n[0]).join('')}</span>
                    <div>
                      <div className="user-cell-name">{user.name}</div>
                      <div className="user-cell-email">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td><span className={`tier-badge ${user.tier.toLowerCase().replace(' ', '-')}`}>{user.tier}</span></td>
                <td>{user.repos}</td>
                <td>
                  <span className={`status-indicator ${user.status.toLowerCase()}`}>
                    <span className="dot" />
                    {user.status}
                  </span>
                </td>
                <td>{user.joined}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Subview: Subscriptions
  const renderSubscriptionsView = () => (
    <div className="admin-subview">
      <h2 className="subview-title">Subscription Plans</h2>
      <p className="subview-subtitle">Billing metrics, plan distributions, and tier parameters.</p>
      
      <div className="plans-grid">
        {[
          { name: 'Free Tier', count: 2402, revenue: '$0', limit: '1 Repo / 3 Scans daily', color: '#64748b' },
          { name: 'Pro Plan', count: 1268, revenue: '$36,772/mo', limit: '10 Repos / Unlimited Scans', color: '#00d4ff' },
          { name: 'Enterprise', count: 450, revenue: '$180,000/mo', limit: 'Custom Repo / Dedicated GPU', color: '#10b981' }
        ].map((plan, idx) => (
          <div key={idx} className="plan-summary-card" style={{ borderTop: `4px solid ${plan.color}` }}>
            <span className="plan-name">{plan.name}</span>
            <div className="plan-count-group">
              <span className="plan-count-val">{plan.count}</span>
              <span className="plan-count-lbl">Active Users</span>
            </div>
            <div className="plan-detail-row">
              <span className="detail-lbl">Monthly Revenue:</span>
              <span className="detail-val">{plan.revenue}</span>
            </div>
            <div className="plan-detail-row">
              <span className="detail-lbl">Access Limits:</span>
              <span className="detail-val">{plan.limit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Subview: AI Agents
  const renderAiAgentsView = () => (
    <div className="admin-subview">
      <h2 className="subview-title">AI Agents Orchestrator</h2>
      <p className="subview-subtitle">Monitor autonomous optimization unit threads and performance indexes.</p>
      
      <div className="agents-list">
        {[
          { name: 'CostOptimizer-04', type: 'FinOps Optimization', status: 'Idle', lastActive: '2m ago', efficiency: '+18.4% Cost Saved', task: 'Optimized EC2 Instances in AWS' },
          { name: 'AutoHeal-01', type: 'Self-Healing Reliability', status: 'Running', lastActive: 'Active now', efficiency: '99.9% Uptime SLA', task: 'Rerouting Latency Spike in Azure' },
          { name: 'SecuritySentry-09', type: 'SAST Security Vulnerability Scan', status: 'Running', lastActive: 'Active now', efficiency: '0 Security Breaches', task: 'Scanning Risi2004/CloudPilot source' }
        ].map((agent, idx) => (
          <div key={idx} className="agent-item-card">
            <div className="agent-header">
              <div>
                <span className="agent-item-name">{agent.name}</span>
                <span className="agent-item-type">{agent.type}</span>
              </div>
              <span className={`status-indicator ${agent.status === 'Running' ? 'active' : 'idle'}`}>
                <span className="dot" />
                {agent.status}
              </span>
            </div>
            <div className="agent-body-grid">
              <div className="agent-meta-box">
                <span className="meta-lbl">CURRENT OPERATION</span>
                <span className="meta-val">{agent.task}</span>
              </div>
              <div className="agent-meta-box">
                <span className="meta-lbl">METRIC INDEX</span>
                <span className="meta-val positive">{agent.efficiency}</span>
              </div>
              <div className="agent-meta-box">
                <span className="meta-lbl">LAST SEEN</span>
                <span className="meta-val">{agent.lastActive}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Subview: Audit Logs
  const renderAuditLogsView = () => (
    <div className="admin-subview">
      <div className="subview-header">
        <div>
          <h2 className="subview-title">System Audit Logs</h2>
          <p className="subview-subtitle">Detailed transactional history of all actions executed on the platform.</p>
        </div>
        <button className="admin-action-btn secondary">Download CSV</button>
      </div>

      <div className="admin-card table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>TIMESTAMP</th>
              <th>ACTOR</th>
              <th>MODULE</th>
              <th>ACTION PERFORMED</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {[
              { time: '2026-06-21 13:23:45', actor: 'Xander King', module: 'DEPLOYER', action: 'Triggered v2SkyNet-project release', status: 'SUCCESS' },
              { time: '2026-06-21 13:13:12', actor: 'AutoHeal-01 (Agent)', module: 'GATEWAY', action: 'Rerouted 20% traffic to AWS us-east-1', status: 'COMPLETED' },
              { time: '2026-06-21 12:40:02', actor: 'Sarah Miller', module: 'AUTH', action: 'Registered account & verified email', status: 'SUCCESS' },
              { time: '2026-06-21 12:12:59', actor: 'System Monitor', module: 'HEALTHCHECK', action: 'Latency spike detected in Azure east-asia', status: 'ALERT' },
              { time: '2026-06-21 11:05:23', actor: 'Admin User', module: 'SETTINGS', action: 'Updated security webhook endpoints', status: 'SUCCESS' }
            ].map((log, idx) => (
              <tr key={idx}>
                <td className="log-time-cell">{log.time}</td>
                <td><strong>{log.actor}</strong></td>
                <td><span className="log-module-badge">{log.module}</span></td>
                <td>{log.action}</td>
                <td>
                  <span className={`status-indicator ${log.status.toLowerCase() === 'alert' ? 'suspended' : 'active'}`}>
                    <span className="dot" />
                    {log.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Subview: Settings
  const renderSettingsView = () => (
    <div className="admin-subview">
      <h2 className="subview-title">Admin System Settings</h2>
      <p className="subview-subtitle">Configure global parameters, toggle features, and manage server credentials.</p>
      
      <div className="settings-grid">
        <div className="admin-card settings-card">
          <h3>Security & Autopilot Modes</h3>
          <div className="setting-toggle-row">
            <div>
              <span className="toggle-label">Autonomous Self-Healing</span>
              <p className="toggle-desc">Allow AutoHeal agent to execute network routing and scaling actions autonomously.</p>
            </div>
            <label className="switch">
              <input type="checkbox" defaultChecked />
              <span className="slider round"></span>
            </label>
          </div>
          <div className="setting-toggle-row">
            <div>
              <span className="toggle-label">Automated Cost Optimization</span>
              <p className="toggle-desc">Allow CostOptimizer agent to scale down redundant EC2 instances at midnight.</p>
            </div>
            <label className="switch">
              <input type="checkbox" defaultChecked />
              <span className="slider round"></span>
            </label>
          </div>
        </div>

        <div className="admin-card settings-card">
          <h3>External Integration API Key</h3>
          <div className="api-key-field">
            <span className="api-key-label">Webhook API Key Endpoint</span>
            <div className="api-key-input-wrapper">
              <input type="password" value="****************************************" disabled className="api-key-input" />
              <button className="copy-key-btn">Reveal</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Sidebar switcher handler
  const renderActiveSubview = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardView();
      case 'users':
        return renderUsersView();
      case 'subscriptions':
        return renderSubscriptionsView();
      case 'ai-agents':
        return renderAiAgentsView();
      case 'audit-logs':
        return renderAuditLogsView();
      case 'settings':
        return renderSettingsView();
      default:
        return (
          <div className="admin-subview">
            <h2 className="subview-title">{activeTab.toUpperCase()} Panel</h2>
            <p className="subview-subtitle">This administrative panel section is configured and ready for implementation.</p>
            <div className="admin-card empty-card">
              <span>Dynamic administrative view for <strong>{activeTab}</strong> coming soon.</span>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="admin-dashboard-container">
      {/* Left Sidebar */}
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Right Content Area */}
      <main className="admin-dashboard-main">
        {renderActiveSubview()}
      </main>
    </div>
  );
}

export default AdminDashboard;
