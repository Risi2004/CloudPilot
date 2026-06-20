import React from 'react';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import '../Dashboard/Dashboard.css';

function AiAssistant() {
  return (
    <DashboardLayout>
      <div className="dashboard-container">
        <div className="dashboard-card">
          <div className="coming-soon-container">
            <h1 className="dashboard-title">AI Assistant</h1>
            <div className="coming-soon-badge">
              <span className="coming-soon-dot"></span>
              <span>COMING SOON</span>
            </div>
          </div>
          <p className="dashboard-subtitle">Consult your autonomous AI copilot for cloud engineering support.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default AiAssistant;
