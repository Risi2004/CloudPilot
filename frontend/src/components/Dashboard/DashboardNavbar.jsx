import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [expandedNotification, setExpandedNotification] = useState(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

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

  const loadNotifications = () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch(`${API_URL}/api/notifications/my`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Notifications fetch failed');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setNotifications(data);
        }
      })
      .catch((err) => {
        console.error('Failed to load user notifications:', err);
      });
  };

  useEffect(() => {
    loadProfile();
    loadNotifications();
    window.addEventListener('profileUpdate', loadProfile);
    window.addEventListener('notificationUpdate', loadNotifications);
    return () => {
      window.removeEventListener('profileUpdate', loadProfile);
      window.removeEventListener('notificationUpdate', loadNotifications);
    };
  }, []);

  // Close profile dropdown on click outside
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

  // Close notifications dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.db-notification-menu-container')) {
        setIsNotificationsOpen(false);
      }
    };
    if (isNotificationsOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isNotificationsOpen]);

  const handleMarkAllRead = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    Promise.all(unread.map(n => 
      fetch(`${API_URL}/api/notifications/${n._id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
    ))
      .then(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      })
      .catch((err) => console.error('Failed to mark notifications read:', err));
  };

  const handleExpandNotification = (notif) => {
    setExpandedNotification(notif);
    setIsNotificationsOpen(false); // Close dropdown menu

    if (!notif.read) {
      const token = localStorage.getItem('token');
      if (!token) return;

      fetch(`${API_URL}/api/notifications/${notif._id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(() => {
          setNotifications((prev) =>
            prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n))
          );
        })
        .catch((err) => console.error('Failed to mark read on server:', err));
    }
  };

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
    if (isOverlayOpen || expandedNotification) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOverlayOpen, expandedNotification]);

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
            onClick={() => handleLinkClick('/platform-selection')}
            className={`db-nav-link ${isActive('/platform-selection')}`}
          >
            Platform Selection
          </button>
          <button
            onClick={() => handleLinkClick('/architecture-recommendation')}
            className={`db-nav-link ${isActive('/architecture-recommendation')}`}
          >
            Architecture
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
          {/* Notification Bell Menu */}
          <div className="db-notification-menu-container" style={{ position: 'relative' }}>
            <button className="db-action-btn notification-btn" onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}>
              <img src={notificationIcon} alt="Notifications" className="db-action-icon" />
              {unreadCount > 0 && <span className="notification-dot"></span>}
            </button>
            
            {isNotificationsOpen && (
              <div className="db-notifications-dropdown">
                <div className="db-dropdown-header">
                  <span className="db-dropdown-name">Notifications</span>
                  {unreadCount > 0 && (
                    <button className="db-mark-all-read-btn" onClick={handleMarkAllRead}>
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="db-dropdown-divider"></div>
                <div className="db-notifications-list">
                  {notifications.length === 0 ? (
                    <div className="db-notification-empty">No notifications matching plan.</div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif._id}
                        className={`db-notification-item ${!notif.read ? 'unread' : ''}`}
                        onClick={() => handleExpandNotification(notif)}
                      >
                        <div className="db-notification-item-top">
                          <span className={`db-notification-item-tag tag-${
                            notif.severity === 'Critical' ? 'failure' : notif.severity === 'Warning' ? 'security' : 'registration'
                          }`}>
                            {notif.category.toUpperCase()}
                          </span>
                          <span className="db-notification-item-time">
                            {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div className="db-notification-item-title">{notif.title}</div>
                        <div className="db-notification-item-message">{notif.message}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Profile Menu */}
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
            onClick={() => handleLinkClick('/platform-selection')}
            className={`db-overlay-link ${isActive('/platform-selection')}`}
          >
            Platform Selection
          </button>
          <button
            onClick={() => handleLinkClick('/architecture-recommendation')}
            className={`db-overlay-link ${isActive('/architecture-recommendation')}`}
          >
            Architecture
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

      {/* Notification Detail Overlay Modal */}
      {expandedNotification && createPortal(
        <div className="notification-modal-overlay" onClick={() => setExpandedNotification(null)}>
          <div className="notification-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="notification-modal-header">
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <span className={`db-notification-item-tag tag-${
                  expandedNotification.severity === 'Critical' ? 'failure' : expandedNotification.severity === 'Warning' ? 'security' : 'registration'
                }`}>
                  {expandedNotification.category.toUpperCase()}
                </span>
                <span className={`user-plan-badge ${expandedNotification.severity.toLowerCase()}`}>
                  {expandedNotification.severity}
                </span>
              </div>
              <h3 className="notification-modal-title">{expandedNotification.title}</h3>
              <p className="notification-modal-time">
                Dispatched on {new Date(expandedNotification.createdAt).toLocaleString()}
              </p>
              <button className="notification-modal-close-btn" onClick={() => setExpandedNotification(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="notification-modal-body">
              {expandedNotification.message}
            </div>
            <div className="notification-modal-footer">
              <button className="notification-modal-btn" onClick={() => setExpandedNotification(null)}>
                Dismiss
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </nav>
  );
}

export default DashboardNavbar;
