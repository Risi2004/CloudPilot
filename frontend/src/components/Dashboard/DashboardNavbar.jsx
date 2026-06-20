import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './DashboardNavbar.css';

// SVG Assets
import logo from '../../assets/logo-without-background.svg';
import notificationIcon from '../../assets/notification.svg';
import profileIcon from '../../assets/profile.svg';

function DashboardNavbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLinkClick = (path) => {
    navigate(path);
  };

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <nav className="db-navbar">
      <div className="db-navbar-container">
        {/* Left Side Logo */}
        <div className="db-navbar-logo" onClick={() => navigate('/')}>
          <img src={logo} alt="CloudPilot Logo" className="db-logo-img" />
        </div>

        {/* Center Links */}
        <div className="db-navbar-links">
          <button
            onClick={() => handleLinkClick('/dashboard')}
            className={`db-nav-link ${isActive('/dashboard')}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => handleLinkClick('/repositories')}
            className={`db-nav-link ${isActive('/repositories')}`}
          >
            Repositories
          </button>
          <button
            onClick={() => handleLinkClick('/workspace-editor')}
            className={`db-nav-link ${isActive('/workspace-editor')}`}
          >
            Workspace Editor
          </button>
          <button
            onClick={() => handleLinkClick('/recommendations')}
            className={`db-nav-link ${isActive('/recommendations')}`}
          >
            Recommendations
          </button>
          <button
            onClick={() => handleLinkClick('/deployment-plan')}
            className={`db-nav-link ${isActive('/deployment-plan')}`}
          >
            Deployment Plan
          </button>
          <button
            onClick={() => handleLinkClick('/ai-assistant')}
            className={`db-nav-link ${isActive('/ai-assistant')}`}
          >
            AI Assistant
          </button>
        </div>

        {/* Right Side Icons */}
        <div className="db-navbar-actions">
          <button className="db-action-btn notification-btn" onClick={() => console.log('View notifications')}>
            <img src={notificationIcon} alt="Notifications" className="db-action-icon" />
          </button>
          <button className="db-action-btn profile-btn" onClick={() => navigate('/dashboard')}>
            <img src={profileIcon} alt="Profile" className="db-action-icon" />
          </button>
        </div>
      </div>
    </nav>
  );
}

export default DashboardNavbar;
