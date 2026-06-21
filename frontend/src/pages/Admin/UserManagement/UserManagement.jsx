import React from 'react';
import './UserManagement.css';

// Layout and widgets
import AdminSidebar from '../../../components/Admin/AdminDashboard/AdminSidebar';
import UserStatCards from '../../../components/Admin/UserManagement/UserStatCards';
import UserListTable from '../../../components/Admin/UserManagement/UserListTable';
import UserInsights from '../../../components/Admin/UserManagement/UserInsights';

function UserManagement() {
  return (
    <div className="admin-dashboard-container">
      {/* Left Sidebar */}
      <AdminSidebar activeTab="users" />

      {/* Right Content Area */}
      <main className="admin-dashboard-main">
        <div className="admin-subview">
          
          {/* Header Row */}
          <div className="user-management-header">
            <div className="header-left">
              <h1 className="user-management-title">User Management</h1>
              <p className="user-management-subtitle">
                Manage permissions, monitor activity, and configure account access across the cluster.
              </p>
            </div>
            
            <div className="header-right">
              {/* Filters Trigger */}
              <button 
                className="user-management-action-btn secondary"
                onClick={() => alert('Filter configurations drawer coming soon!')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="btn-icon">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                Filters
              </button>
              
              {/* Invite User Trigger */}
              <button 
                className="user-management-action-btn primary"
                onClick={() => {
                  const email = prompt('Enter the email address of the operator to invite:');
                  if (email) alert(`Invitation dispatched successfully to ${email}`);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="btn-icon">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <line x1="20" y1="8" x2="20" y2="14"></line>
                  <line x1="23" y1="11" x2="17" y2="11"></line>
                </svg>
                Invite User
              </button>
            </div>
          </div>

          {/* Stats Section */}
          <UserStatCards />

          {/* Table list Section */}
          <UserListTable />

          {/* AI Insights & Security events Section */}
          <UserInsights />

        </div>
      </main>
    </div>
  );
}

export default UserManagement;
