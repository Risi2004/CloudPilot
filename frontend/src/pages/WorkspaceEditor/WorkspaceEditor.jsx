import React, { useState } from 'react';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import ProjectHeader from '../../components/WorkspaceEditor/ProjectHeader';
import NavigationTabs from '../../components/WorkspaceEditor/NavigationTabs';
import CloudResources from '../../components/WorkspaceEditor/CloudResources';
import TerraformPanel from '../../components/WorkspaceEditor/TerraformPanel';
import AiAssistantPanel from '../../components/WorkspaceEditor/AiAssistantPanel';
import ActionBar from '../../components/WorkspaceEditor/ActionBar';
import './WorkspaceEditor.css';

function WorkspaceEditor() {
  const [activeTab, setActiveTab] = useState('Infrastructure');

  return (
    <DashboardLayout>
      <div className="ws-page">
        {/* Project header bar */}
        <ProjectHeader />

        {/* Sub-navigation tabs */}
        <NavigationTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Main content */}
        <div className="ws-main">
          {/* Left column */}
          <div className="ws-left-col">
            {/* Cloud Resources */}
            <CloudResources />

            {/* Terraform code editor */}
            <TerraformPanel />
          </div>

          {/* Right column: AI Assistant */}
          <AiAssistantPanel />
        </div>
      </div>

      {/* Bottom action bar */}
      <ActionBar />
    </DashboardLayout>
  );
}

export default WorkspaceEditor;
