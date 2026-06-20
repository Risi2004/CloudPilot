import React from 'react';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import '../Dashboard/Dashboard.css';

function Recommendations() {
  return (
    <DashboardLayout>
      <div className="dashboard-container">
        <div className="dashboard-card">
          <div className="coming-soon-container">
            <h1 className="dashboard-title">Recommendations</h1>
            <div className="coming-soon-badge">
              <span className="coming-soon-dot"></span>
              <span>COMING SOON</span>
            </div>
          </div>
          <p className="dashboard-subtitle">View intelligent cloud optimization and cost recommendations.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Recommendations;
