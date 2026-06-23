import React, { useState, useEffect } from 'react';
import './Notification.css';

import AdminSidebar from '../../../components/Admin/AdminDashboard/AdminSidebar';
import NotificationFeed from '../../../components/Admin/Notification/NotificationFeed';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Notification() {
  const [notifications, setNotifications] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form Mode: 'create' | 'edit' | null
  const [formMode, setFormMode] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formCategory, setFormCategory] = useState('general');
  const [formSeverity, setFormSeverity] = useState('Info');
  const [formTargetTiers, setFormTargetTiers] = useState(['All']);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setNotifications(data);
        if (data.length > 0) {
          setActiveId(data[0]._id);
        } else {
          setActiveId(null);
        }
        setError(null);
      } else {
        setError(data.message || 'Failed to retrieve notification logs.');
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError('Connection failure. Could not reach server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const activeNotification = notifications.find((n) => n._id === activeId);

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'all') return true;
    return n.category === activeFilter;
  });

  const handleOpenCreate = () => {
    setFormTitle('');
    setFormMessage('');
    setFormCategory('general');
    setFormSeverity('Info');
    setFormTargetTiers(['All']);
    setFormMode('create');
  };

  const handleOpenEdit = (notif) => {
    setFormTitle(notif.title);
    setFormMessage(notif.message);
    setFormCategory(notif.category);
    setFormSeverity(notif.severity);
    setFormTargetTiers(notif.targetTiers);
    setFormMode('edit');
  };

  const handleTierChange = (tier) => {
    if (tier === 'All') {
      setFormTargetTiers(['All']);
    } else {
      setFormTargetTiers((prev) => {
        const filtered = prev.filter((t) => t !== 'All');
        if (filtered.includes(tier)) {
          const next = filtered.filter((t) => t !== tier);
          return next.length === 0 ? ['All'] : next;
        } else {
          return [...filtered, tier];
        }
      });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formTitle.trim() || !formMessage.trim() || formTargetTiers.length === 0) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = formMode === 'create'
        ? `${API_URL}/api/notifications`
        : `${API_URL}/api/notifications/${activeId}`;
      const method = formMode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formTitle,
          message: formMessage,
          category: formCategory,
          severity: formSeverity,
          targetTiers: formTargetTiers
        })
      });

      const data = await res.json();
      if (res.ok) {
        if (formMode === 'create') {
          setNotifications((prev) => [data, ...prev]);
          setActiveId(data._id);
        } else {
          setNotifications((prev) => prev.map((n) => (n._id === data._id ? data : n)));
        }
        setFormMode(null);
      } else {
        alert(data.message || 'Error processing request.');
      }
    } catch (err) {
      console.error('Failed to save notification:', err);
      alert('Failed to connect to API server.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this notification? Targeted subscription holders will be notified by email.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setNotifications((prev) => {
          const remaining = prev.filter((n) => n._id !== id);
          if (remaining.length > 0) {
            setActiveId(remaining[0]._id);
          } else {
            setActiveId(null);
          }
          return remaining;
        });
        setFormMode(null);
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete notification.');
      }
    } catch (err) {
      console.error('Delete request failed:', err);
      alert('Connection error.');
    }
  };

  // Map backend model fields to feed component structures
  const feedNotifications = filteredNotifications.map((n) => ({
    id: n._id,
    category: n.category,
    tag: n.category.toUpperCase(),
    tagColor: n.severity === 'Critical' ? 'failure' : n.severity === 'Warning' ? 'security' : 'registration',
    timeAgo: new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    title: n.title,
    snippet: n.message,
    read: true // Feed looks clean with read states hidden on admin management
  }));

  return (
    <div className="admin-dashboard-container">
      <AdminSidebar activeTab="notifications" />

      <main className="admin-dashboard-main">
        <div className="admin-subview notification-page">
          
          {/* Header section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div>
              <h1 className="user-management-title" style={{ fontSize: '24px', fontWeight: '800', color: '#fff', margin: 0, textAlign: 'left' }}>
                Fleet Broadcast Manager
              </h1>
              <p className="user-management-subtitle" style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0', textAlign: 'left' }}>
                Create, update, and dispatch critical announcements and targeted updates to user plan swarms.
              </p>
            </div>
            {formMode === null && (
              <button className="create-notification-btn" onClick={handleOpenCreate}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Create Notification
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ color: '#94a3b8', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
              Syncing notifications cluster telemetry...
            </div>
          ) : error ? (
            <div style={{ color: '#ef4444', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', flexDirection: 'column', gap: '10px' }}>
              <span>{error}</span>
              <button className="form-btn secondary" onClick={fetchNotifications}>Retry Connection</button>
            </div>
          ) : (
            <div className="notification-layout-split">
              {/* Left Column: Notification list feed */}
              <div className="notification-feed-column">
                <NotificationFeed
                  notifications={feedNotifications}
                  activeId={activeId}
                  activeFilter={activeFilter}
                  onSelect={(id) => {
                    setActiveId(id);
                    setFormMode(null); // Close form when switching view
                  }}
                  onFilterChange={setActiveFilter}
                  onMarkAllRead={() => alert('Administrators view all broadcasts in historical state.')}
                />
              </div>

              {/* Right Column: Display details OR form */}
              <div className="notification-detail-column">
                {formMode !== null ? (
                  <form className="notification-form-card" onSubmit={handleSave}>
                    <h3 className="notification-form-title">
                      {formMode === 'create' ? 'Create Fleet Broadcast' : 'Edit Fleet Broadcast'}
                    </h3>

                    <div className="notification-form-group">
                      <label className="notification-form-label">Broadcast Title</label>
                      <input
                        type="text"
                        className="notification-form-input"
                        placeholder="e.g. Scheduled Network Upgrade"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div className="notification-form-group">
                      <label className="notification-form-label">Target Subscription Swarms</label>
                      <div className="notification-form-checkboxes">
                        <label className="notification-form-checkbox-label">
                          <input
                            type="checkbox"
                            checked={formTargetTiers.includes('All')}
                            onChange={() => handleTierChange('All')}
                          />
                          All Users
                        </label>
                        <label className="notification-form-checkbox-label">
                          <input
                            type="checkbox"
                            checked={formTargetTiers.includes('Free') && !formTargetTiers.includes('All')}
                            onChange={() => handleTierChange('Free')}
                          />
                          Free Tier
                        </label>
                        <label className="notification-form-checkbox-label">
                          <input
                            type="checkbox"
                            checked={formTargetTiers.includes('Pro') && !formTargetTiers.includes('All')}
                            onChange={() => handleTierChange('Pro')}
                          />
                          Pro Tier
                        </label>
                        <label className="notification-form-checkbox-label">
                          <input
                            type="checkbox"
                            checked={formTargetTiers.includes('Enterprise') && !formTargetTiers.includes('All')}
                            onChange={() => handleTierChange('Enterprise')}
                          />
                          Enterprise Tier
                        </label>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="notification-form-group">
                        <label className="notification-form-label">Category</label>
                        <select
                          className="notification-form-select"
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value)}
                        >
                          <option value="general">General</option>
                          <option value="failures">Failures</option>
                          <option value="agents">Agents</option>
                          <option value="security">Security</option>
                          <option value="billing">Billing</option>
                        </select>
                      </div>

                      <div className="notification-form-group">
                        <label className="notification-form-label">Severity Level</label>
                        <select
                          className="notification-form-select"
                          value={formSeverity}
                          onChange={(e) => setFormSeverity(e.target.value)}
                        >
                          <option value="Info">Info</option>
                          <option value="Warning">Warning</option>
                          <option value="Critical">Critical</option>
                        </select>
                      </div>
                    </div>

                    <div className="notification-form-group" style={{ flex: 1, minHeight: '120px' }}>
                      <label className="notification-form-label">Message / Broadcast Details</label>
                      <textarea
                        className="notification-form-input"
                        placeholder="Write detailed announcements or markdown guides here..."
                        style={{ height: '100%', resize: 'none', minHeight: '100px' }}
                        value={formMessage}
                        onChange={(e) => setFormMessage(e.target.value)}
                        required
                      />
                    </div>

                    <div className="notification-form-actions">
                      <button type="button" className="form-btn secondary" onClick={() => setFormMode(null)}>
                        Cancel
                      </button>
                      <button type="submit" className="form-btn primary">
                        {formMode === 'create' ? 'Dispatch Broadcast' : 'Update Broadcast'}
                      </button>
                    </div>
                  </form>
                ) : activeNotification ? (
                  <div className="admin-notification-detail-card">
                    <div className="detail-header-row">
                      <div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                          <span className={`notification-tag tag-${
                            activeNotification.severity === 'Critical' ? 'failure' : activeNotification.severity === 'Warning' ? 'security' : 'registration'
                          }`}>
                            {activeNotification.category.toUpperCase()}
                          </span>
                          <span className={`metadata-value severity-${activeNotification.severity.toLowerCase()}`} style={{ fontSize: '11px', fontWeight: '700' }}>
                            {activeNotification.severity === 'Critical' ? 'CRITICAL ALERT' : activeNotification.severity.toUpperCase()}
                          </span>
                        </div>
                        <h2 className="detail-title">{activeNotification.title}</h2>
                      </div>
                    </div>

                    <div className="notification-metadata-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
                      <div className="metadata-box">
                        <span className="metadata-label">Date Dispatched</span>
                        <span className="metadata-value">
                          {new Date(activeNotification.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="metadata-box">
                        <span className="metadata-label">Target Audience</span>
                        <span className="metadata-value" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                          {activeNotification.targetTiers.map((t) => (
                            <span key={t} className={`badge-tier ${t.toLowerCase()}`}>{t}</span>
                          ))}
                        </span>
                      </div>
                    </div>

                    <div className="notification-section" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '120px' }}>
                      <h3 className="detail-section-title">Broadcast Details</h3>
                      <div className="detail-message-box">
                        {activeNotification.message}
                      </div>
                    </div>

                    <div className="detail-footer-actions">
                      <button type="button" className="detail-btn delete" onClick={() => handleDelete(activeNotification._id)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                        Delete Broadcast
                      </button>
                      <button type="button" className="detail-btn edit" onClick={() => handleOpenEdit(activeNotification)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit Details
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.06)', color: '#64748b' }}>
                    Select a broadcast from the feed list or trigger a new creation form to begin.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Notification;
