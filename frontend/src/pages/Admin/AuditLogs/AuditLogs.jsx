import React, { useState } from 'react';
import './AuditLogs.css';

// Layout and widgets
import AdminSidebar from '../../../components/Admin/AdminDashboard/AdminSidebar';
import AuditFilters from '../../../components/Admin/AuditLogs/AuditFilters';
import AuditLogsTable from '../../../components/Admin/AuditLogs/AuditLogsTable';
import AuditStats from '../../../components/Admin/AuditLogs/AuditStats';

// SVG Icons from Assets
import exportCsvIcon from '../../../assets/export-csv.svg';
import exportJsonIcon from '../../../assets/export-json.svg';

const MOCK_AUDIT_LOGS = [
  {
    id: 'log-1',
    timestamp: '2023-10-24 14:22:05',
    event: 'Failed Login Attempt',
    subject: 'admin@cloudpilot.ai',
    target: 'Web Dashboard (IP: 192.168.1.1)',
    severity: 'CRITICAL',
    details: {
      status: 'BLOCKED',
      description: 'Unauthorized access attempt detected on the main admin portal dashboard. Access blocked after 5 consecutive credential failures.',
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
      payload: {
        reason: 'Invalid password credentials hash mismatch',
        attempts: 5,
        targetPort: 443,
        sessionBlockMinutes: 30
      }
    }
  },
  {
    id: 'log-2',
    timestamp: '2023-10-24 14:15:33',
    event: 'Scale Group Optimized',
    subject: 'AI Agent "Pilot-01"',
    target: 'Cluster-US-East-1',
    severity: 'INFO',
    details: {
      status: 'COMPLETED',
      description: 'Autopilot CostOptimizer triggered down-scaling of cluster node group ASG-West-02. Terminated 2 redundant VMs under low CPU utilization.',
      agentId: 'CostOptimizer-04',
      payload: {
        savingsAmount: 1240,
        nodesTerminated: 2,
        triggerMetric: 'CPU Utilization < 15%',
        durationSec: 4.8
      }
    }
  },
  {
    id: 'log-3',
    timestamp: '2023-10-24 13:58:12',
    event: 'User Permission Update',
    subject: 'Sarah Jenkins',
    target: 'Marcus Aurelius (User ID: 882)',
    severity: 'INFO',
    details: {
      status: 'SUCCESS',
      description: 'Sarah Jenkins elevated access permissions for operator Marcus Aurelius to Administrator status inside repository "Risi2004/CloudPilot".',
      payload: {
        oldRole: 'Operator',
        newRole: 'Admin',
        repository: 'Risi2004/CloudPilot',
        grantedScopes: ['read_file', 'write_file', 'delete_deployment']
      }
    }
  },
  {
    id: 'log-4',
    timestamp: '2023-10-24 12:30:00',
    event: 'Subscription Upgraded',
    subject: 'System',
    target: 'Billing Cycle OCT-2023',
    severity: 'WARNING',
    details: {
      status: 'UPGRADED',
      description: 'Platform billing engine auto-renewed corporate subscription. Account upgraded thresholds automatically to support high-growth scan rates.',
      payload: {
        baseCost: 15000,
        usagePremium: 2840,
        finalInvoiceTotal: 17840,
        quotaLimits: '100 Repositories, 500 scans/day'
      }
    }
  },
  {
    id: 'log-5',
    timestamp: '2023-10-24 09:12:44',
    event: 'Platform Hotfix Deployed',
    subject: 'Deployment Bot',
    target: 'Core Engine (v2.4.1)',
    severity: 'INFO',
    details: {
      status: 'SUCCESS',
      description: 'Deployment Bot successfully built and hot-patched the core engine API route handlers to v2.4.1. Reduced log aggregation overhead.',
      payload: {
        buildId: 'BLD-998827',
        commitHash: 'a8b7c3d9e2',
        latencyReductionMs: 42,
        strategy: 'Blue-Green Rollout'
      }
    }
  },
  {
    id: 'log-6',
    timestamp: '2023-10-23 18:40:12',
    event: 'Failed Login Attempt',
    subject: 'attacker@evil.org',
    target: 'API Gateway (IP: 203.0.113.50)',
    severity: 'CRITICAL',
    details: {
      status: 'BLOCKED',
      description: 'Brute-force credential dictionary attack detected on database auth API gateways. Node IP blocked indefinitely.',
      ip: '203.0.113.50',
      userAgent: 'curl/7.81.0',
      payload: {
        endpointsScanned: 24,
        totalFailedRequests: 120,
        geoIpLocation: 'Unknown/Proxy'
      }
    }
  },
  {
    id: 'log-7',
    timestamp: '2023-10-22 10:05:00',
    event: 'User Permission Update',
    subject: 'Sarah Jenkins',
    target: 'System Webhook Keys',
    severity: 'WARNING',
    details: {
      status: 'SUCCESS',
      description: 'Sarah Jenkins rotated internal webhook security signatures and updated platform credentials.',
      payload: {
        modifiedKeys: ['webhook_url', 'secret_signature_hash'],
        triggeredEvents: ['slack_channel_update']
      }
    }
  },
  {
    id: 'log-8',
    timestamp: '2023-10-20 22:15:30',
    event: 'Scale Group Optimized',
    subject: 'AI Agent "Pilot-01"',
    target: 'Cluster-EU-West-1',
    severity: 'INFO',
    details: {
      status: 'COMPLETED',
      description: 'Scaled out VMs group for incident spike and traffic congestion handling in EU West regions.',
      agentId: 'AutoHeal-01',
      payload: {
        nodesAdded: 4,
        averageLatencyBeforeMs: 412,
        averageLatencyAfterMs: 98,
        costTrend: '+12% per/hour'
      }
    }
  },
  {
    id: 'log-9',
    timestamp: '2023-10-18 11:22:00',
    event: 'Subscription Upgraded',
    subject: 'admin@cloudpilot.ai',
    target: 'User Account (ID: 108)',
    severity: 'INFO',
    details: {
      status: 'SUCCESS',
      description: 'Administrator manually upgraded user account (ID: 108) to enterprise tier billing cycle.',
      payload: {
        targetUserId: 108,
        tierRequested: 'Enterprise Plan',
        approvalToken: 'TOK-998822'
      }
    }
  },
  {
    id: 'log-10',
    timestamp: '2023-10-15 08:30:15',
    event: 'Platform Hotfix Deployed',
    subject: 'Deployment Bot',
    target: 'Core Engine (v2.4.0)',
    severity: 'INFO',
    details: {
      status: 'SUCCESS',
      description: 'Platform hotfix build v2.4.0 rollout completed. Added multi-cluster peering and FinOps orchestrators.',
      payload: {
        tag: 'v2.4.0',
        strategy: 'Canary Deployed',
        rolloutSuccess: true
      }
    }
  }
];

function AuditLogs() {
  const [filters, setFilters] = useState({
    dateRange: '24h',
    category: 'all',
    adminUser: 'all',
    severity: 'all'
  });

  const handleFilterChange = (key, val) => {
    setFilters((prev) => ({
      ...prev,
      [key]: val
    }));
  };

  // Perform dynamic client-side filtering
  const filteredLogs = MOCK_AUDIT_LOGS.filter((log) => {
    // 1. Filter by Date Range
    const logDate = new Date(log.timestamp.split(' ')[0]);
    const refDate = new Date('2023-10-24'); // Current reference date of logs
    const diffTime = Math.abs(refDate - logDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (filters.dateRange === '24h' && diffDays > 1) return false;
    if (filters.dateRange === '7d' && diffDays > 7) return false;
    if (filters.dateRange === '30d' && diffDays > 30) return false;

    // 2. Filter by Event Category
    if (filters.category !== 'all') {
      const cat = filters.category;
      if (cat === 'Authentication' && !log.event.includes('Login')) return false;
      if (cat === 'Compute Scaling' && !log.event.includes('Scale')) return false;
      if (cat === 'Access Control' && !log.event.includes('Permission')) return false;
      if (cat === 'Deployment' && (!log.event.includes('Hotfix') && !log.event.includes('Subscription'))) return false;
    }

    // 3. Filter by User
    if (filters.adminUser !== 'all' && log.subject !== filters.adminUser) return false;

    // 4. Filter by Severity
    if (filters.severity !== 'all' && log.severity.toUpperCase() !== filters.severity.toUpperCase()) return false;

    return true;
  });

  // Client-side file downloader for CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert('No logs available to export.');
      return;
    }
    
    const headers = 'ID,Timestamp,Event,Subject,Target,Severity,Status,Description\n';
    const rows = filteredLogs
      .map(
        (log) =>
          `"${log.id}","${log.timestamp}","${log.event}","${log.subject}","${log.target}","${log.severity}","${log.details.status}","${log.details.description.replace(/"/g, '""')}"`
      )
      .join('\n');
      
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cloudpilot_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert('Preparing CSV data exports...\nCSV download will begin shortly.');
  };

  // Client-side file downloader for JSON
  const handleExportJSON = () => {
    if (filteredLogs.length === 0) {
      alert('No logs available to export.');
      return;
    }

    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cloudpilot_audit_logs_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert('Preparing JSON metadata payload exports...\nJSON download will begin shortly.');
  };

  return (
    <div className="admin-dashboard-container">
      {/* Left Sidebar */}
      <AdminSidebar activeTab="audit-logs" />

      {/* Right Content Area */}
      <main className="admin-dashboard-main">
        <div className="admin-subview">
          {/* Header Row */}
          <div className="audit-header-row">
            <div className="header-left">
              <h1 className="audit-page-title">Audit Logs</h1>
              <p className="audit-page-subtitle">
                Comprehensive event monitoring for CloudPilot Enterprise workspace.
              </p>
            </div>

            <div className="header-right">
              {/* Export CSV */}
              <button className="audit-action-btn" onClick={handleExportCSV}>
                <img src={exportCsvIcon} alt="Export CSV" className="btn-icon-img" />
                Export CSV
              </button>

              {/* Export JSON */}
              <button className="audit-action-btn" onClick={handleExportJSON}>
                <img src={exportJsonIcon} alt="Export JSON" className="btn-icon-img" />
                Export JSON
              </button>
            </div>
          </div>

          {/* Filters Row */}
          <AuditFilters filters={filters} onChangeFilter={handleFilterChange} />

          {/* Logs Table */}
          <AuditLogsTable logs={filteredLogs} />

          {/* AI Insights & Security stats */}
          <AuditStats />
        </div>
      </main>
    </div>
  );
}

export default AuditLogs;
