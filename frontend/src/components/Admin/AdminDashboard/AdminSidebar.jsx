import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminSidebar.css';

// SVG Assets
import logo from '../../../assets/logo-without-background.svg';
import dashboardIcon from '../../../assets/dashboard.svg';
import usersIcon from '../../../assets/users.svg';
import subscriptionsIcon from '../../../assets/subscriptions.svg';
import revenueIcon from '../../../assets/revenue-navbar.svg'; // Revenue icon
import aiAgentsIcon from '../../../assets/ai-agents.svg';
import knowledgeBaseIcon from '../../../assets/knowledge-base.svg';
import supportIcon from '../../../assets/support.svg';
import notificationsIcon from '../../../assets/notifications.svg';
import auditLogsIcon from '../../../assets/audit-logs.svg';
import settingsIcon from '../../../assets/settings.svg';

const MENU_ITEMS = [
  { id: 'dashboard', name: 'Dashboard', icon: dashboardIcon },
  { id: 'users', name: 'Users', icon: usersIcon },
  { id: 'subscriptions', name: 'Subscriptions', icon: subscriptionsIcon },
  { id: 'revenue', name: 'Revenue', icon: revenueIcon, isCustomColor: true },
  { id: 'ai-agents', name: 'AI Agents', icon: aiAgentsIcon },
  { id: 'knowledge-base', name: 'Knowledge Base', icon: knowledgeBaseIcon },
  { id: 'support', name: 'Support', icon: supportIcon },
  { id: 'notifications', name: 'Notifications', icon: notificationsIcon },
  { id: 'audit-logs', name: 'Audit Logs', icon: auditLogsIcon },
  { id: 'settings', name: 'Settings', icon: settingsIcon }
];

function AdminSidebar({ activeTab, setActiveTab }) {
  const navigate = useNavigate();

  const handleNavClick = (itemId) => {
    if (setActiveTab) {
      setActiveTab(itemId);
    }
    if (itemId === 'dashboard') {
      navigate('/admin');
    } else if (itemId === 'users') {
      navigate('/admin/users');
    } else if (itemId === 'subscriptions') {
      navigate('/admin/subscriptions');
    } else if (itemId === 'revenue') {
      navigate('/admin/revenue');
    } else if (itemId === 'ai-agents') {
      navigate('/admin/ai-agents');
    } else if (itemId === 'knowledge-base') {
      navigate('/admin/knowledge-base');
    } else if (itemId === 'support') {
      navigate('/admin/support');
    } else if (itemId === 'notifications') {
      navigate('/admin/notifications');
    } else if (itemId === 'audit-logs') {
      navigate('/admin/audit-logs');
    } else if (itemId === 'settings') {
      navigate('/admin/settings');
    }
  };

  return (
    <aside className="admin-sidebar">
      {/* Brand logo section */}
      <div className="admin-sidebar-brand" onClick={() => handleNavClick('dashboard')}>
        <img src={logo} alt="CloudPilot Logo" className="admin-brand-logo" />
        <div className="admin-brand-text">
          <span className="brand-title">CLOUDPILOT</span>
          <span className="brand-tag">ADMIN PORTAL</span>
        </div>
      </div>

      {/* Navigation items */}
      <nav className="admin-sidebar-nav">
        {MENU_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`admin-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
            >
              <span className="admin-nav-icon-container">
                <img 
                  src={item.icon} 
                  alt={item.name} 
                  className={`admin-nav-icon ${item.isCustomColor ? 'custom-color' : ''}`} 
                />
              </span>
              <span className="admin-nav-text">{item.name}</span>
              {isActive && <div className="active-nav-indicator" />}
            </button>
          );
        })}
      </nav>

      {/* Admin user info footer */}
      <div className="admin-sidebar-footer">
        <div className="admin-user-profile">
          <div className="admin-avatar-wrapper">
            <div className="admin-avatar-dot" />
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="admin-default-avatar-svg">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div className="admin-user-details">
            <span className="admin-user-name">Admin User</span>
            <span className="admin-user-role">Profile Settings</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default AdminSidebar;
