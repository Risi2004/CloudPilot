import React from 'react';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import '../Dashboard/Dashboard.css';

function AiAssistant() {
  return (
    <DashboardLayout>
      <div className="dashboard-container">
        <div className="dashboard-card">
          <h1 className="dashboard-title">AI Assistant</h1>
          <p className="dashboard-subtitle">Consult your autonomous AI copilot for cloud engineering support.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default AiAssistant;
