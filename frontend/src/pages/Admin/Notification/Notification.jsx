import React, { useState } from 'react';
import './Notification.css';

import AdminSidebar from '../../../components/Admin/AdminDashboard/AdminSidebar';
import CriticalAlertBanner from '../../../components/Admin/Notification/CriticalAlertBanner';
import NotificationFeed from '../../../components/Admin/Notification/NotificationFeed';
import NotificationDetail from '../../../components/Admin/Notification/NotificationDetail';

const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-1',
    category: 'failures',
    tag: 'FAILURE',
    tagColor: 'failure',
    timeAgo: '2m ago',
    title: "Agent 'Sentinel-9' Failure",
    snippet: 'Memory overflow detected on node cluster-us-east-1. Agent process terminated unexpectedly.',
    read: false,
    eventId: 'EVT-2024-8842',
    region: 'us-east-1',
    timestamp: '2024-06-21 14:32:18 UTC',
    severity: 'Critical',
    component: 'Sentinel-9 / Node-7A3F',
    summary:
      "Agent 'Sentinel-9' encountered a fatal memory overflow while processing real-time threat detection on node cluster-us-east-1. The agent process was terminated by the kernel OOM killer after exceeding its 16GB memory allocation. 847 active monitoring threads were abruptly halted.",
    aiRecommendation:
      'Increase memory allocation to 24GB and enable swap buffering. Consider redistributing workload across Sentinel-8 and Sentinel-10 to prevent single-node saturation.',
    systemContext: {
      cpu: 82,
      memory: 99,
    },
    actions: [
      { id: 'logs', label: 'View System Logs', icon: 'logs' },
      { id: 'restart', label: 'Restart Agent with 24GB RAM', icon: 'restart' },
      { id: 'assign', label: 'Assign to Engineering Team', icon: 'assign' },
    ],
  },
  {
    id: 'notif-2',
    category: 'agents',
    tag: 'REGISTRATION',
    tagColor: 'registration',
    timeAgo: '15m ago',
    title: 'New Agent Registered',
    snippet: 'Agent "CostOptimizer-05" successfully joined the swarm and is awaiting initial task assignment.',
    read: false,
    eventId: 'EVT-2024-8839',
    region: 'eu-west-1',
    timestamp: '2024-06-21 14:19:42 UTC',
    severity: 'Info',
    component: 'CostOptimizer-05',
    summary:
      'A new FinOps optimization agent has been provisioned and registered with the orchestrator. The agent passed all health checks and is ready to receive workload assignments.',
    aiRecommendation:
      'Assign initial cost audit task on AWS us-east-1 cluster. Estimated savings potential: 12-18% based on current utilization patterns.',
    systemContext: { cpu: 12, memory: 34 },
    actions: [
      { id: 'logs', label: 'View Agent Profile', icon: 'logs' },
      { id: 'restart', label: 'Assign Initial Task', icon: 'restart' },
      { id: 'assign', label: 'Configure Thresholds', icon: 'assign' },
    ],
  },
  {
    id: 'notif-3',
    category: 'security',
    tag: 'SECURITY',
    tagColor: 'security',
    timeAgo: '1h ago',
    title: 'Unauthorized API Access Attempt',
    snippet: 'Blocked 12 consecutive failed authentication requests from IP 203.0.113.50 targeting admin endpoints.',
    read: true,
    eventId: 'EVT-2024-8831',
    region: 'global',
    timestamp: '2024-06-21 13:32:05 UTC',
    severity: 'Warning',
    component: 'API Gateway / Auth Module',
    summary:
      'Brute-force credential attack detected against admin API endpoints. Source IP has been automatically blocked and added to the threat intelligence feed.',
    aiRecommendation:
      'Enable rate limiting on /api/admin/* routes. Consider implementing CAPTCHA challenge after 3 failed attempts.',
    systemContext: { cpu: 45, memory: 58 },
    actions: [
      { id: 'logs', label: 'View Attack Logs', icon: 'logs' },
      { id: 'restart', label: 'Block IP Permanently', icon: 'restart' },
      { id: 'assign', label: 'Notify Security Team', icon: 'assign' },
    ],
  },
  {
    id: 'notif-4',
    category: 'failures',
    tag: 'FAILURE',
    tagColor: 'failure',
    timeAgo: '3h ago',
    title: 'Deployment Pipeline Timeout',
    snippet: 'CI/CD pipeline for project "skynet-v2" exceeded 30-minute build threshold and was auto-cancelled.',
    read: true,
    eventId: 'EVT-2024-8820',
    region: 'us-west-2',
    timestamp: '2024-06-21 11:45:30 UTC',
    severity: 'Warning',
    component: 'DeployBot / Pipeline-12',
    summary:
      'The automated deployment pipeline for skynet-v2 failed to complete within the configured 30-minute timeout. Build stage consumed 94% of allocated resources before cancellation.',
    aiRecommendation:
      'Enable build caching and parallel test execution. Previous successful builds averaged 18 minutes with caching enabled.',
    systemContext: { cpu: 94, memory: 76 },
    actions: [
      { id: 'logs', label: 'View Build Logs', icon: 'logs' },
      { id: 'restart', label: 'Retry with Caching', icon: 'restart' },
      { id: 'assign', label: 'Escalate to DevOps', icon: 'assign' },
    ],
  },
  {
    id: 'notif-5',
    category: 'agents',
    tag: 'REGISTRATION',
    tagColor: 'registration',
    timeAgo: '5h ago',
    title: 'Agent Health Check Passed',
    snippet: 'All 9 active agents reported healthy status during scheduled 6-hour health sweep.',
    read: true,
    eventId: 'EVT-2024-8815',
    region: 'multi-region',
    timestamp: '2024-06-21 09:30:00 UTC',
    severity: 'Info',
    component: 'HealthMonitor / Swarm',
    summary:
      'Scheduled health sweep completed successfully. All agents are operational with average response latency under 45ms.',
    aiRecommendation: 'No action required. System operating within normal parameters.',
    systemContext: { cpu: 38, memory: 52 },
    actions: [
      { id: 'logs', label: 'View Health Report', icon: 'logs' },
      { id: 'restart', label: 'Export Metrics', icon: 'restart' },
      { id: 'assign', label: 'Schedule Next Sweep', icon: 'assign' },
    ],
  },
];

function Notification() {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [activeId, setActiveId] = useState('notif-1');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showCriticalBanner, setShowCriticalBanner] = useState(true);

  const activeNotification = notifications.find((n) => n.id === activeId) || notifications[0];

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'all') return true;
    return n.category === activeFilter;
  });

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleMarkResolved = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    const remaining = notifications.filter((n) => n.id !== id);
    if (remaining.length > 0) {
      setActiveId(remaining[0].id);
    }
  };

  const handleQuickFix = (id) => {
    alert(`Quick fix initiated for notification ${id}. Agent restart queued.`);
    handleMarkResolved(id);
  };

  return (
    <div className="admin-dashboard-container">
      <AdminSidebar activeTab="notifications" />

      <main className="admin-dashboard-main">
        <div className="admin-subview notification-page">
          {showCriticalBanner && (
            <CriticalAlertBanner onDismiss={() => setShowCriticalBanner(false)} />
          )}

          <div className="notification-layout-split">
            <div className="notification-feed-column">
              <NotificationFeed
                notifications={filteredNotifications}
                activeId={activeId}
                activeFilter={activeFilter}
                onSelect={setActiveId}
                onFilterChange={setActiveFilter}
                onMarkAllRead={handleMarkAllRead}
              />
            </div>

            <div className="notification-detail-column">
              {activeNotification && (
                <NotificationDetail
                  notification={activeNotification}
                  onMarkResolved={() => handleMarkResolved(activeNotification.id)}
                  onQuickFix={() => handleQuickFix(activeNotification.id)}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Notification;
