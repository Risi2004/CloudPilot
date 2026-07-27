import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import ConnectedRepositories from '../../components/Dashboard/Widgets/ConnectedRepositories';
import RecentAnalyses from '../../components/Dashboard/Widgets/RecentAnalyses';
import ActiveDeployments from '../../components/Dashboard/Widgets/ActiveDeployments';
import MonitoringStatus from '../../components/Dashboard/Widgets/MonitoringStatus';
import CostSummary from '../../components/Dashboard/Widgets/CostSummary';
import AlertsWidget from '../../components/Dashboard/Widgets/AlertsWidget';
import './Dashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Dashboard() {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const [analyses, setAnalyses] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const [analysesRes, deploymentsRes, credentialsRes] = await Promise.all([
          fetch(`${API_URL}/api/analysis`, { headers }),
          fetch(`${API_URL}/api/deployment`, { headers }),
          fetch(`${API_URL}/api/credentials`, { headers }),
        ]);

        if (analysesRes.ok) {
          const analysesData = await analysesRes.json();
          setAnalyses(analysesData.analyses || []);
        }
        if (deploymentsRes.ok) {
          const deploymentsData = await deploymentsRes.json();
          setDeployments(deploymentsData.deployments || []);
        }
        if (credentialsRes.ok) {
          const credentialsData = await credentialsRes.json();
          setCredentials(credentialsData.credentials || []);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <DashboardLayout>
      <div className="dashboard-page-wrapper">
        {/* Top welcome section */}
        <header className="dashboard-header-section">
          <div className="header-text-container">
            <h1 className="dashboard-page-title">Mission Control</h1>
            <p className="dashboard-page-subtitle">
              Overview of your autonomous cloud infrastructure, security alerts, and system health metrics.
            </p>
          </div>
          <div className="header-date-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>{currentDate}</span>
          </div>
        </header>

        {loading ? (
          <div className="dashboard-loading-state">
            <div className="dashboard-loading-spinner"></div>
            <span>Loading your infrastructure metrics...</span>
          </div>
        ) : (
          /* Dashboard grid container */
          <div className="dashboard-grid-container">
            <div className="grid-item span-2">
              <RecentAnalyses analyses={analyses} />
            </div>
            <div className="grid-item">
              <AlertsWidget analyses={analyses} />
            </div>
            <div className="grid-item">
              <ConnectedRepositories analyses={analyses} />
            </div>
            <div className="grid-item">
              <CostSummary deployments={deployments} credentials={credentials} />
            </div>
            <div className="grid-item">
              <MonitoringStatus deployments={deployments} />
            </div>
            <div className="grid-item span-3">
              <ActiveDeployments deployments={deployments} />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;

