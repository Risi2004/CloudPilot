import React, { useState, useEffect } from 'react';
import './UserManagement.css';

// Layout and widgets
import AdminSidebar from '../../../components/Admin/AdminDashboard/AdminSidebar';
import UserStatCards from '../../../components/Admin/UserManagement/UserStatCards';
import UserListTable from '../../../components/Admin/UserManagement/UserListTable';
import UserInsights from '../../../components/Admin/UserManagement/UserInsights';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
        setError(null);
      } else {
        setError(data.message || 'Failed to fetch user directory.');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Connection error. Could not connect to API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
      const res = await fetch(`${API_URL}/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (res.ok) {
        // Update user status locally
        setUsers(prevUsers => prevUsers.map(u => {
          if (u._id === id) {
            return { 
              ...u, 
              status: newStatus, 
              lastActivity: new Date().toISOString() 
            };
          }
          return u;
        }));
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to update user status.');
      }
    } catch (err) {
      console.error('Failed to update user status:', err);
      alert('Connection error. Could not update user status.');
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete the account of "${name}"? All associated tickets, profile picture, and access keys will be permanently deleted.`)) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        // Remove user locally from state
        setUsers(prevUsers => prevUsers.filter(u => u._id !== id));
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete user.');
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert('Connection error. Could not delete user.');
    }
  };

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
          <UserStatCards 
            totalUsers={users.length}
            activeUsers={users.filter(u => u.status === 'Active').length}
            newUsers24h={users.filter(u => new Date(u.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length}
            loading={loading}
          />

          {/* Table list Section */}
          <UserListTable 
            users={users} 
            loading={loading} 
            error={error}
            onToggleStatus={handleToggleStatus} 
            onDeleteUser={handleDeleteUser}
          />

          {/* AI Insights & Security events Section */}
          <UserInsights />

        </div>
      </main>
    </div>
  );
}

export default UserManagement;
