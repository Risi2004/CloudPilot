import React, { useState } from 'react';
import './UserListTable.css';

const INITIAL_USERS = [
  {
    id: 'usr-1',
    name: 'Jordan Driskell',
    email: 'jordan@nebula-systems.io',
    plan: 'Enterprise',
    status: 'Active',
    lastActivity: '2 mins ago',
    avatarText: 'JD',
    avatarBg: 'rgba(99, 102, 241, 0.15)',
    avatarColor: '#818cf8'
  },
  {
    id: 'usr-2',
    name: 'Aria Sterling',
    email: 'a.sterling@cloudflow.com',
    plan: 'Pro',
    status: 'Active',
    lastActivity: '14 mins ago',
    avatarText: 'AS',
    avatarBg: 'rgba(20, 184, 166, 0.15)',
    avatarColor: '#2dd4bf'
  },
  {
    id: 'usr-3',
    name: 'Marcus Kane',
    email: 'm.kane@freemail.io',
    plan: 'Free',
    status: 'Suspended',
    lastActivity: '3 days ago',
    avatarText: 'MK',
    avatarBg: 'rgba(239, 68, 68, 0.15)',
    avatarColor: '#f87171'
  },
  {
    id: 'usr-4',
    name: 'Li Xiao',
    email: 'l.xiao@vertex-corp.cn',
    plan: 'Enterprise',
    status: 'Active',
    lastActivity: 'Just now',
    avatarText: 'LX',
    avatarBg: 'rgba(59, 130, 246, 0.15)',
    avatarColor: '#60a5fa'
  },
  {
    id: 'usr-5',
    name: 'Elena Thorne',
    email: 'ethorne@quant.io',
    plan: 'Pro',
    status: 'Active',
    lastActivity: '1 hour ago',
    avatarText: 'ET',
    avatarBg: 'rgba(139, 92, 246, 0.15)',
    avatarColor: '#a78bfa'
  }
];

function UserListTable() {
  const [filter, setFilter] = useState('All');
  const [users, setUsers] = useState(INITIAL_USERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Filter logic
  const filteredUsers = users.filter((u) => {
    if (filter === 'All') return true;
    return u.status === filter;
  });

  const handleActionClick = (id, e) => {
    e.stopPropagation();
    setActiveDropdown(activeDropdown === id ? null : id);
  };

  const handleToggleStatus = (id) => {
    setUsers(users.map(u => {
      if (u.id === id) {
        return {
          ...u,
          status: u.status === 'Active' ? 'Suspended' : 'Active',
          lastActivity: 'Just now'
        };
      }
      return u;
    }));
    setActiveDropdown(null);
  };

  // Close dropdown on clicking window
  React.useEffect(() => {
    const closeAll = () => setActiveDropdown(null);
    window.addEventListener('click', closeAll);
    return () => window.removeEventListener('click', closeAll);
  }, []);

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
            Showing 1-{filteredUsers.length} of 12,842 users
          </span>
        </div>
        
        <div className="toolbar-right">
          {/* Download Action */}
          <button className="toolbar-icon-btn" title="Export CSV">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
          {/* Settings Action */}
          <button className="toolbar-icon-btn" title="Table Configurations">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
        </div>
      </div>

      {/* User Table */}
      <div className="user-table-wrapper">
        <table className="user-table">
          <thead>
            <tr>
              <th>USER NAME</th>
              <th>EMAIL</th>
              <th>PLAN</th>
              <th>STATUS</th>
              <th>LAST ACTIVITY</th>
              <th className="text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="user-row">
                
                {/* User Name */}
                <td className="col-name">
                  <div className="user-cell">
                    <span 
                      className="user-avatar-bubble"
                      style={{ backgroundColor: user.avatarBg, color: user.avatarColor }}
                    >
                      {user.avatarText}
                    </span>
                    <span className="user-name-text">{user.name}</span>
                  </div>
                </td>

                {/* Email */}
                <td className="col-email">
                  <span className="email-text">{user.email}</span>
                </td>

                {/* Plan */}
                <td className="col-plan">
                  <span className={`plan-badge ${user.plan.toLowerCase()}`}>
                    {user.plan}
                  </span>
                </td>

                {/* Status */}
                <td className="col-status">
                  <span className={`status-pill ${user.status.toLowerCase()}`}>
                    <span className="pill-dot" />
                    {user.status}
                  </span>
                </td>

                {/* Last Activity */}
                <td className="col-activity">
                  <span className="activity-text">{user.lastActivity}</span>
                </td>

                {/* Actions */}
                <td className="col-actions text-right">
                  <div className="action-menu-container">
                    <button 
                      className="table-action-dots-btn" 
                      onClick={(e) => handleActionClick(user.id, e)}
                    >
                      •••
                    </button>
                    {activeDropdown === user.id && (
                      <div className="action-dropdown-menu">
                        <button onClick={() => handleToggleStatus(user.id)}>
                          {user.status === 'Active' ? 'Suspend Account' : 'Activate Account'}
                        </button>
                        <button onClick={() => alert(`Direct email to ${user.email} initiated.`)}>
                          Contact User
                        </button>
                      </div>
                    )}
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Pagination */}
      <div className="user-table-footer">
        <div className="pagination-controls">
          <button 
            className="pag-btn" 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            Previous
          </button>
          
          <button 
            className={`pag-number-btn ${currentPage === 1 ? 'active' : ''}`}
            onClick={() => setCurrentPage(1)}
          >
            1
          </button>
          <button 
            className={`pag-number-btn ${currentPage === 2 ? 'active' : ''}`}
            onClick={() => setCurrentPage(2)}
          >
            2
          </button>
          <button 
            className={`pag-number-btn ${currentPage === 3 ? 'active' : ''}`}
            onClick={() => setCurrentPage(3)}
          >
            3
          </button>
          
          <span className="pag-ellipsis">...</span>
          
          <button 
            className={`pag-number-btn ${currentPage === 128 ? 'active' : ''}`}
            onClick={() => setCurrentPage(128)}
          >
            128
          </button>
          
          <button 
            className="pag-btn" 
            disabled={currentPage === 128}
            onClick={() => setCurrentPage(currentPage + 1)}
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

    </div>
  );
}

export default UserListTable;
