import React, { useState } from 'react';
import './Settings.css';

// Layout and widgets
import AdminSidebar from '../../../components/Admin/AdminDashboard/AdminSidebar';
import GeneralSettings from '../../../components/Admin/Settings/GeneralSettings';
import IntegrationsSettings from '../../../components/Admin/Settings/IntegrationsSettings';
import SecuritySettings from '../../../components/Admin/Settings/SecuritySettings';

const INITIAL_SETTINGS = {
  platformName: 'CloudPilot Admin',
  adminEmail: 'alerts@cloudpilot.internal',
  githubOrg: 'gh_p_**********************',
  awsAccessKey: 'AKIA...',
  stripeWebhook: 'whsec_...',
  ollamaEndpoint: 'http://localhost:11434',
  vectorDb: 'grpc://cluster-v1.pinecone.io',
  enforce2fa: true,
  sessionTimeout: 120
};

function Settings() {
  const [formState, setFormState] = useState({ ...INITIAL_SETTINGS });

  const handleInputChange = (key, value) => {
    setFormState((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleToggleChange = (key) => {
    setFormState((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleDiscard = () => {
    if (window.confirm('Are you sure you want to discard all unsaved changes?')) {
      setFormState({ ...INITIAL_SETTINGS });
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    // Validate inputs
    if (!formState.platformName.trim()) {
      alert('Platform display name cannot be blank.');
      return;
    }
    if (!formState.adminEmail.trim()) {
      alert('Routing email cannot be blank.');
      return;
    }

    console.log('Saved CloudPilot configurations:', formState);
    alert(
      `Workspace settings updated successfully!\n\n` +
      `Platform: ${formState.platformName}\n` +
      `AI Engine: ${formState.ollamaEndpoint}\n` +
      `2FA Enforced: ${formState.enforce2fa ? 'Yes' : 'No'}\n` +
      `Timeout: ${formState.sessionTimeout}m`
    );
  };

  return (
    <div className="admin-dashboard-container">
      {/* Left Sidebar */}
      <AdminSidebar activeTab="settings" />

      {/* Right Content Area */}
      <main className="admin-dashboard-main">
        <form className="admin-subview" onSubmit={handleSave}>
          {/* Header Row */}
          <div className="settings-header-row">
            <div className="header-left">
              <h1 className="settings-page-title">Global Workspace Settings</h1>
              <p className="settings-page-subtitle">
                Manage your workspace identity, integrations, and security protocols.
              </p>
            </div>

            <div className="header-right">
              {/* Discard button */}
              <button
                type="button"
                className="settings-discard-btn"
                onClick={handleDiscard}
              >
                Discard
              </button>

              {/* Save Changes button */}
              <button type="submit" className="settings-save-btn">
                Save Changes
              </button>
            </div>
          </div>

          {/* Top layout split */}
          <div className="settings-split-row">
            <div className="general-settings-column">
              <GeneralSettings
                platformName={formState.platformName}
                adminEmail={formState.adminEmail}
                onInputChange={handleInputChange}
              />
            </div>

            <div className="integrations-settings-column">
              <IntegrationsSettings
                githubOrg={formState.githubOrg}
                awsAccessKey={formState.awsAccessKey}
                stripeWebhook={formState.stripeWebhook}
                ollamaEndpoint={formState.ollamaEndpoint}
                vectorDb={formState.vectorDb}
                onInputChange={handleInputChange}
              />
            </div>
          </div>

          {/* Bottom security row */}
          <div className="settings-bottom-row">
            <SecuritySettings
              enforce2fa={formState.enforce2fa}
              sessionTimeout={formState.sessionTimeout}
              onInputChange={handleInputChange}
              onToggleChange={handleToggleChange}
            />
          </div>
        </form>
      </main>
    </div>
  );
}

export default Settings;
