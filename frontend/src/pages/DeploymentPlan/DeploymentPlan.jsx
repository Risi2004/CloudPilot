import React from 'react';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import '../Dashboard/Dashboard.css';

function DeploymentPlan() {
  return (
    <DashboardLayout>
      <div className="dashboard-container">
        <div className="dashboard-card">
          <h1 className="dashboard-title">Deployment Plan</h1>
          <p className="dashboard-subtitle">Simulate, generate and execute your cloud deployment blueprints.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default DeploymentPlan;
