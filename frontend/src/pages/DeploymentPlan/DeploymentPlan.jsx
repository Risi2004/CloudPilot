import React from 'react';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import '../Dashboard/Dashboard.css';

function DeploymentPlan() {
  return (
    <DashboardLayout>
      <div className="dashboard-container">
        <div className="dashboard-card">
          <div className="coming-soon-container">
            <h1 className="dashboard-title">Deployment Plan</h1>
            <div className="coming-soon-badge">
              <span className="coming-soon-dot"></span>
              <span>COMING SOON</span>
            </div>
          </div>
          <p className="dashboard-subtitle">Simulate, generate and execute your cloud deployment blueprints.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default DeploymentPlan;
