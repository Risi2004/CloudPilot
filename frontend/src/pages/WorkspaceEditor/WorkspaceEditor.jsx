import React from 'react';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import '../Dashboard/Dashboard.css';

function WorkspaceEditor() {
  return (
    <DashboardLayout>
      <div className="dashboard-container">
        <div className="dashboard-card">
          <div className="coming-soon-container">
            <h1 className="dashboard-title">Workspace Editor</h1>
            <div className="coming-soon-badge">
              <span className="coming-soon-dot"></span>
              <span>COMING SOON</span>
            </div>
          </div>
          <p className="dashboard-subtitle">Manage and edit your workspace configuration here.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default WorkspaceEditor;
