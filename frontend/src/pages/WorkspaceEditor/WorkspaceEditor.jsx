import React from 'react';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import '../Dashboard/Dashboard.css';

function WorkspaceEditor() {
  return (
    <DashboardLayout>
      <div className="dashboard-container">
        <div className="dashboard-card">
          <h1 className="dashboard-title">Workspace Editor</h1>
          <p className="dashboard-subtitle">Manage and edit your workspace configuration here.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default WorkspaceEditor;
