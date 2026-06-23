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
  const [userPlan, setUserPlan] = useState('Free');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const loadProfile = () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch(`${API_URL}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Token verification failed');
        return res.json();
      })
      .then((data) => {
        const user = data.user;
        setUserName(user.fullName || 'Commander');
        setUserEmail(user.email || '');
        setUserPlan(user.plan || 'Free');

        // Sync local storage
        localStorage.setItem('fullName', user.fullName || '');
        localStorage.setItem('email', user.email || '');
        localStorage.setItem('plan', user.plan || 'Free');
        if (user.profileImageKey) {
          localStorage.setItem('profileImageKey', user.profileImageKey);
          const filename = user.profileImageKey.split('/').pop();
          setAvatar(`${API_URL}/api/auth/profile-image/${filename}`);
        } else {
          localStorage.removeItem('profileImageKey');
          setAvatar(profileIcon);
        }
      })
      .catch((err) => {
        console.error('Failed to sync profile inside navbar:', err);
        // Fallback to local storage values if network/auth fails
        const name = localStorage.getItem('fullName') || 'Commander';
        const mail = localStorage.getItem('email') || 'commander@fleet.io';
        const plan = localStorage.getItem('plan') || 'Free';
        const savedKey = localStorage.getItem('profileImageKey');
        const savedImage = localStorage.getItem('profileImage');

        setUserName(name);
        setUserEmail(mail);
        setUserPlan(plan);

        if (savedKey) {
          const filename = savedKey.split('/').pop();
          setAvatar(`${API_URL}/api/auth/profile-image/${filename}`);
        } else if (savedImage) {
          setAvatar(savedImage);
        } else {
          setAvatar(profileIcon);
        }
      });
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
    localStorage.removeItem('role');
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
            onClick={() => handleLinkClick('/support')}
            className={`db-nav-link ${isActive('/support')}`}
          >
            Support
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
                  <div className="db-dropdown-name-container">
                    <span className="db-dropdown-name">{userName}</span>
                    <span className={`user-plan-badge ${userPlan.toLowerCase()}`}>
                      {userPlan}
                    </span>
                  </div>
                  <div className="db-dropdown-email">{userEmail}</div>
                </div>
                <div className="db-dropdown-divider"></div>
                <div className="db-dropdown-actions">
                  <button className="db-dropdown-item" onClick={() => { setIsProfileDropdownOpen(false); navigate('/view-profile'); }}>
                    View Profile
                  </button>
                  <button className="db-dropdown-item" onClick={() => { setIsProfileDropdownOpen(false); navigate('/upgrade'); }}>
                    Upgrade Plan
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
            onClick={() => handleLinkClick('/support')}
            className={`db-overlay-link ${isActive('/support')}`}
          >
            Support
          </button>
        </div>
      </div>
    </nav>
  );
}

export default DashboardNavbar;
