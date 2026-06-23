import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './UserListTable.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Helper to extract initials from full name
const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
};

// Helper to assign a consistent, beautiful background color based on email hash
const getAvatarStyles = (email) => {
  const themes = [
    { bg: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }, // Indigo
    { bg: 'rgba(20, 184, 166, 0.15)', color: '#2dd4bf' }, // Teal
    { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }, // Blue
    { bg: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }, // Purple
    { bg: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }  // Pink
  ];
  let hash = 0;
  if (email) {
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
  }
  const index = Math.abs(hash) % themes.length;
  return themes[index];
};

// Helper to format last activity timestamp into local date and time string
const formatLastActivity = (dateString) => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return date.toLocaleString();
};

function UserListTable({ users = [], loading = false, error = null, onToggleStatus, onDeleteUser }) {
  const [filter, setFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [activeDropdown, setActiveDropdown] = useState(null);
  
  // Table configurations state
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState(() => {
    const saved = localStorage.getItem('cloudpilot_user_table_cols');
    return saved ? JSON.parse(saved) : { email: true, plan: true, status: true, lastActivity: true };
  });
  const [denseMode, setDenseMode] = useState(() => {
    return localStorage.getItem('cloudpilot_user_table_dense') === 'true';
  });

  // Persist settings in local storage
  useEffect(() => {
    localStorage.setItem('cloudpilot_user_table_cols', JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  useEffect(() => {
    localStorage.setItem('cloudpilot_user_table_dense', denseMode);
  }, [denseMode]);

  // Filter logic
  const filteredUsers = users.filter((u) => {
    if (filter === 'All') return true;
    return u.status === filter;
  });

  // Pagination bounds checking
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));
  const adjustedCurrentPage = currentPage > totalPages ? totalPages : currentPage;
  
  const indexOfLastRow = adjustedCurrentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredUsers.slice(indexOfFirstRow, indexOfLastRow);

  const handleActionClick = (id, e) => {
    e.stopPropagation();
    setActiveDropdown(activeDropdown === id ? null : id);
  };

  // Close dropdown on window clicks
  useEffect(() => {
    const closeAll = () => setActiveDropdown(null);
    window.addEventListener('click', closeAll);
    return () => window.removeEventListener('click', closeAll);
  }, []);

  // Reset pagination on filter update
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, rowsPerPage]);

  return (
    <div className="user-list-card">
      
      {/* Toolbar / Header Row */}
      <div className="user-list-toolbar">
        <div className="toolbar-left">
          <div className="filter-tabs">
            {['All', 'Active', 'Suspended'].map((tab) => (
              <button
                key={tab}
                className={`filter-tab-btn ${filter === tab ? 'active' : ''}`}
                onClick={() => setFilter(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <span className="showing-records-text">
            {loading ? (
              'Fetching records...'
            ) : (
              `Showing ${filteredUsers.length > 0 ? indexOfFirstRow + 1 : 0}-${Math.min(indexOfLastRow, filteredUsers.length)} of ${filteredUsers.length} users`
            )}
          </span>
        </div>
        
        <div className="toolbar-right">
          {/* Download Action */}
          <button 
            className="toolbar-icon-btn" 
            title="Export CSV"
            onClick={() => {
              if (users.length === 0) return alert('No users to export.');
              const headers = ['Full Name', 'Email', 'Plan', 'Status', 'Last Activity'];
              const csvContent = [
                headers.join(','),
                ...users.map(u => [
                  `"${u.fullName.replace(/"/g, '""')}"`,
                  `"${u.email}"`,
                  `"${u.plan || 'Free'}"`,
                  `"${u.status || 'Active'}"`,
                  `"${u.lastActivity ? new Date(u.lastActivity).toISOString() : ''}"`
                ].join(','))
              ].join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.setAttribute('download', `CloudPilot_Users_${new Date().toLocaleDateString()}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
          {/* Settings Action */}
          <button className="toolbar-icon-btn" title="Table Configurations" onClick={() => setConfigModalOpen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
        </div>
      </div>

      {/* User Table Wrapper */}
      <div className="user-table-wrapper">
        {loading ? (
          <div className="users-table-loading">
            <svg className="users-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <circle cx="12" cy="12" r="10" strokeDasharray="40 20" strokeLinecap="round" />
            </svg>
            <span>Fetching user directory from cluster...</span>
          </div>
        ) : error ? (
          <div className="users-table-error">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{error}</span>
          </div>
        ) : currentRows.length === 0 ? (
          <div className="users-table-empty">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            <span>No user accounts found matching this criteria.</span>
          </div>
        ) : (
          <table className={`user-table ${denseMode ? 'dense' : ''}`}>
            <thead>
              <tr>
                <th>USER NAME</th>
                {columnVisibility.email && <th>EMAIL</th>}
                {columnVisibility.plan && <th>PLAN</th>}
                {columnVisibility.status && <th>STATUS</th>}
                {columnVisibility.lastActivity && <th>LAST ACTIVITY</th>}
                <th className="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.map((user) => {
                const avatar = getAvatarStyles(user.email);
                return (
                  <tr key={user._id} className="user-row">
                    
                    {/* User Name */}
                    <td className="col-name">
                      <div className="user-cell">
                        {user.profileImageKey ? (
                          <img 
                            src={`${API_URL}/api/auth/profile-image/${user.profileImageKey.split('/').pop()}`}
                            alt={user.fullName}
                            className="user-avatar-image"
                          />
                        ) : (
                          <span 
                            className="user-avatar-bubble"
                            style={{ backgroundColor: avatar.bg, color: avatar.color }}
                          >
                            {getInitials(user.fullName)}
                          </span>
                        )}
                        <span className="user-name-text">{user.fullName}</span>
                      </div>
                    </td>

                    {/* Email */}
                    {columnVisibility.email && (
                      <td className="col-email">
                        <span className="email-text">{user.email}</span>
                      </td>
                    )}

                    {/* Plan */}
                    {columnVisibility.plan && (
                      <td className="col-plan">
                        <span className={`plan-badge ${(user.plan || 'Free').toLowerCase()}`}>
                          {user.plan || 'Free'}
                        </span>
                      </td>
                    )}

                    {/* Status */}
                    {columnVisibility.status && (
                      <td className="col-status">
                        <span className={`status-pill ${(user.status || 'Active').toLowerCase()}`}>
                          <span className="pill-dot" />
                          {user.status || 'Active'}
                        </span>
                      </td>
                    )}

                    {/* Last Activity */}
                    {columnVisibility.lastActivity && (
                      <td className="col-activity">
                        <span className="activity-text">{formatLastActivity(user.lastActivity || user.createdAt)}</span>
                      </td>
                    )}

                    {/* Actions */}
                    <td className="col-actions text-right">
                      <div className="action-menu-container">
                        <button 
                          className="table-action-dots-btn" 
                          onClick={(e) => handleActionClick(user._id, e)}
                        >
                          •••
                        </button>
                        {activeDropdown === user._id && (
                          <div className="action-dropdown-menu">
                            <button onClick={() => onToggleStatus(user._id, user.status || 'Active')}>
                              {(user.status || 'Active') === 'Active' ? 'Suspend Account' : 'Activate Account'}
                            </button>
                            <button onClick={() => alert(`Direct email to ${user.email} initiated.`)}>
                              Contact User
                            </button>
                            <button 
                              onClick={() => onDeleteUser(user._id, user.fullName)}
                              className="delete-user-btn"
                            >
                              Delete Account
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer Pagination */}
      {!loading && !error && filteredUsers.length > 0 && (
        <div className="user-table-footer">
          <div className="pagination-controls">
            <button 
              className="pag-btn" 
              disabled={adjustedCurrentPage === 1}
              onClick={() => setCurrentPage(adjustedCurrentPage - 1)}
            >
              Previous
            </button>
            
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
              <button 
                key={page}
                className={`pag-number-btn ${adjustedCurrentPage === page ? 'active' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            
            <button 
              className="pag-btn" 
              disabled={adjustedCurrentPage === totalPages}
              onClick={() => setCurrentPage(adjustedCurrentPage + 1)}
            >
              Next
            </button>
          </div>

          <div className="rows-per-page">
            <span className="rows-lbl">Rows per page:</span>
            <div className="select-wrapper">
              <select 
                value={rowsPerPage} 
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                className="rows-select"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Configurations Modal Portal */}
      {configModalOpen && createPortal(
        <div className="promo-modal-overlay" onClick={() => setConfigModalOpen(false)}>
          <div className="promo-modal-card config-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="promo-modal-title">Table Configuration</h3>
            
            <div className="config-section">
              <span className="config-section-title">Column Visibility</span>
              <div className="config-options-list">
                <label className="config-checkbox-row">
                  <input 
                    type="checkbox" 
                    checked={columnVisibility.email}
                    onChange={(e) => setColumnVisibility(prev => ({ ...prev, email: e.target.checked }))}
                  />
                  <span className="promo-custom-box" />
                  <span className="config-label-text">Show Email Column</span>
                </label>
                
                <label className="config-checkbox-row">
                  <input 
                    type="checkbox" 
                    checked={columnVisibility.plan}
                    onChange={(e) => setColumnVisibility(prev => ({ ...prev, plan: e.target.checked }))}
                  />
                  <span className="promo-custom-box" />
                  <span className="config-label-text">Show Subscription Plan Column</span>
                </label>
                
                <label className="config-checkbox-row">
                  <input 
                    type="checkbox" 
                    checked={columnVisibility.status}
                    onChange={(e) => setColumnVisibility(prev => ({ ...prev, status: e.target.checked }))}
                  />
                  <span className="promo-custom-box" />
                  <span className="config-label-text">Show Account Status Column</span>
                </label>
                
                <label className="config-checkbox-row">
                  <input 
                    type="checkbox" 
                    checked={columnVisibility.lastActivity}
                    onChange={(e) => setColumnVisibility(prev => ({ ...prev, lastActivity: e.target.checked }))}
                  />
                  <span className="promo-custom-box" />
                  <span className="config-label-text">Show Last Activity Column</span>
                </label>
              </div>
            </div>

            <div className="config-section">
              <span className="config-section-title">Display Density</span>
              <label className="config-checkbox-row">
                <input 
                  type="checkbox" 
                  checked={denseMode}
                  onChange={(e) => setDenseMode(e.target.checked)}
                />
                <span className="promo-custom-box" />
                <span className="config-label-text">Enable Dense Table Mode (Narrow Rows)</span>
              </label>
            </div>

            <div className="promo-modal-actions">
              <button 
                type="button" 
                className="promo-modal-btn submit" 
                onClick={() => setConfigModalOpen(false)}
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

export default UserListTable;
