import React from 'react';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import '../Dashboard/Dashboard.css';

function Recommendations() {
  return (
    <DashboardLayout>
      <div className="dashboard-container">
        <div className="dashboard-card">
          <h1 className="dashboard-title">Recommendations</h1>
          <p className="dashboard-subtitle">View intelligent cloud optimization and cost recommendations.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Recommendations;
