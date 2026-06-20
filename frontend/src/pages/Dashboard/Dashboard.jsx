import React from 'react';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import './Dashboard.css';

function Dashboard() {
  return (
    <DashboardLayout>
      <div className="dashboard-container">
        <div className="dashboard-card">
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">Welcome to the CloudPilot Mission Control.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
