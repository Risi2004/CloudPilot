import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './DashboardNavbar.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// SVG Assets
import logo from '../../assets/logo-without-background.svg';
import menuIcon from '../../assets/menu.svg';
import notificationIcon from '../../assets/notification.svg';
import profileIcon from '../../assets/profile.svg';

function DashboardNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [avatar, setAvatar] = useState(profileIcon);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const loadProfile = () => {
    const savedKey = localStorage.getItem('profileImageKey');
    const savedImage = localStorage.getItem('profileImage');
    const name = localStorage.getItem('fullName') || 'Commander';
    const mail = localStorage.getItem('email') || 'commander@fleet.io';
    
    setUserName(name);
    setUserEmail(mail);

    if (savedKey) {
      const filename = savedKey.split('/').pop();
      setAvatar(`${API_URL}/api/auth/profile-image/${filename}`);
    } else if (savedImage) {
      setAvatar(savedImage);
    } else {
      setAvatar(profileIcon);
    }
  };

  useEffect(() => {
    loadProfile();
    window.addEventListener('profileUpdate', loadProfile);
    return () => {
      window.removeEventListener('profileUpdate', loadProfile);
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.db-profile-menu-container')) {
        setIsProfileDropdownOpen(false);
      }
    };
    if (isProfileDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isProfileDropdownOpen]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('fullName');
    localStorage.removeItem('profileImageKey');
    localStorage.removeItem('profileImage');
    setIsProfileDropdownOpen(false);
    navigate('/login');
  };

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
          
          <div className="db-profile-menu-container" style={{ position: 'relative' }}>
            <button className="db-action-btn profile-btn" onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}>
              <img src={avatar} alt="Profile" className="db-action-icon" />
            </button>
            
            {isProfileDropdownOpen && (
              <div className="db-profile-dropdown">
                <div className="db-dropdown-header">
                  <div className="db-dropdown-name">{userName}</div>
                  <div className="db-dropdown-email">{userEmail}</div>
                </div>
                <div className="db-dropdown-divider"></div>
                <div className="db-dropdown-actions">
                  <button className="db-dropdown-item" onClick={() => { setIsProfileDropdownOpen(false); navigate('/view-profile'); }}>
                    View Profile
                  </button>
                  <button className="db-dropdown-item logout" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>

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
