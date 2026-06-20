import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './DashboardNavbar.css';

// SVG Assets
import logo from '../../assets/logo-without-background.svg';
import menuIcon from '../../assets/menu.svg';
import notificationIcon from '../../assets/notification.svg';
import profileIcon from '../../assets/profile.svg';

function DashboardNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  useEffect(() => {
    if (isOverlayOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOverlayOpen]);

  const handleLinkClick = (path) => {
    setIsOverlayOpen(false);
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
          <button className="db-menu-btn" onClick={() => setIsOverlayOpen(true)}>
            <img src={menuIcon} alt="Menu" className="db-menu-icon-img" />
          </button>
        </div>
      </div>

      {/* Mobile Overlay Menu */}
      <div className={`db-navbar-mobile-overlay ${isOverlayOpen ? 'active' : ''}`}>
        <div className="db-overlay-header">
          <img src={logo} alt="CloudPilot Logo" className="db-logo-img" onClick={() => handleLinkClick('/dashboard')} style={{ cursor: 'pointer' }} />
          <button className="db-close-btn" onClick={() => setIsOverlayOpen(false)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div className="db-overlay-links">
          <button
            onClick={() => handleLinkClick('/dashboard')}
            className={`db-overlay-link ${isActive('/dashboard')}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => handleLinkClick('/repositories')}
            className={`db-overlay-link ${isActive('/repositories')}`}
          >
            Repositories
          </button>
          <button
            onClick={() => handleLinkClick('/workspace-editor')}
            className={`db-overlay-link ${isActive('/workspace-editor')}`}
          >
            Workspace Editor
          </button>
          <button
            onClick={() => handleLinkClick('/recommendations')}
            className={`db-overlay-link ${isActive('/recommendations')}`}
          >
            Recommendations
          </button>
          <button
            onClick={() => handleLinkClick('/deployment-plan')}
            className={`db-overlay-link ${isActive('/deployment-plan')}`}
          >
            Deployment Plan
          </button>
          <button
            onClick={() => handleLinkClick('/ai-assistant')}
            className={`db-overlay-link ${isActive('/ai-assistant')}`}
          >
            AI Assistant
          </button>
        </div>
      </div>
    </nav>
  );
}

export default DashboardNavbar;
