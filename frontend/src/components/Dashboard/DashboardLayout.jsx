import React from 'react';
import DashboardNavbar from './DashboardNavbar';
import DashboardFooter from './DashboardFooter';
import './DashboardLayout.css';

function DashboardLayout({ children }) {
  return (
    <div className="db-layout-wrapper">
      <DashboardNavbar />
      <main className="db-layout-main-content">
        {children}
      </main>
      <DashboardFooter />
    </div>
  );
}

export default DashboardLayout;
