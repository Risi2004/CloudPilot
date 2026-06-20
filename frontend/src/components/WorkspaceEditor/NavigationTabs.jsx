import React from 'react';

function NavigationTabs({ activeTab, setActiveTab }) {
  const tabs = ['Architecture', 'Infrastructure', 'Deployment', 'Environment', 'Documentation'];

  return (
    <nav className="ws-tabs" aria-label="Workspace sections">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          className={`ws-tab ${activeTab === tab ? 'active' : ''}`}
          onClick={() => setActiveTab && setActiveTab(tab)}
        >
          {tab}
        </button>
      ))}
    </nav>
  );
}

export default NavigationTabs;
