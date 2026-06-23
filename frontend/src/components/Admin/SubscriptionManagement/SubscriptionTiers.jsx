import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './SubscriptionTiers.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function SubscriptionTiers() {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modal / Form States
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | 'delete' | null
  const [selectedTier, setSelectedTier] = useState(null);
  
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [badge, setBadge] = useState('');
  const [badgeClass, setBadgeClass] = useState('community-badge');
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [subscribers, setSubscribers] = useState(0);
  const [features, setFeatures] = useState(['']);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch plans from API
  const fetchTiers = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/subscriptions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch subscription tiers.');
      }
      setTiers(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Connection to server failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTiers();
  }, []);

  // Notifications auto-dismiss
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Open modals helper
  const openCreateModal = () => {
    setName('');
    setPrice('');
    setBadge('');
    setBadgeClass('community-badge');
    setIsHighlighted(false);
    setSubscribers(0);
    setFeatures(['']);
    setDescription('');
    setModalMode('create');
  };

  const openEditModal = (tier) => {
    setSelectedTier(tier);
    setName(tier.name);
    setPrice(tier.price);
    setBadge(tier.badge || '');
    setBadgeClass(tier.badgeClass || 'community-badge');
    setIsHighlighted(!!tier.isHighlighted);
    setSubscribers(tier.subscribers || 0);
    setFeatures(tier.features && tier.features.length > 0 ? [...tier.features] : ['']);
    setDescription(tier.description || '');
    setModalMode('edit');
  };

  const openDeleteModal = (tier) => {
    setSelectedTier(tier);
    setModalMode('delete');
  };

  // Dynamic features handlers
  const handleFeatureChange = (index, value) => {
    const updatedFeatures = [...features];
    updatedFeatures[index] = value;
    setFeatures(updatedFeatures);
  };

  const addFeatureInput = () => {
    setFeatures([...features, '']);
  };

  const removeFeatureInput = (index) => {
    if (features.length === 1) {
      setFeatures(['']);
    } else {
      setFeatures(features.filter((_, idx) => idx !== index));
    }
  };

  // Submit Handler
  const handleSubmitPlan = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    // Filter out empty features
    const filteredFeatures = features.map(f => f.trim()).filter(f => f !== '');

    const payload = {
      name: name.trim(),
      price: Number(price),
      badge: badge.trim(),
      badgeClass,
      isHighlighted,
      subscribers: Number(subscribers),
      features: filteredFeatures,
      description: description.trim()
    };

    try {
      const token = localStorage.getItem('token');
      let res;
      if (modalMode === 'create') {
        res = await fetch(`${API_URL}/api/subscriptions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${API_URL}/api/subscriptions/${selectedTier._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to save tier.');
      }

      setSuccessMessage(modalMode === 'create' ? 'Plan created successfully!' : 'Plan updated successfully!');
      setModalMode(null);
      fetchTiers();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Handler
  const handleDeletePlan = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/subscriptions/${selectedTier._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete plan.');
      }

      setSuccessMessage('Plan deleted permanently!');
      setModalMode(null);
      fetchTiers();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="subscription-tiers-wrapper">
      {/* Alert Banners */}
      {successMessage && <div className="sub-alert success-alert">{successMessage}</div>}
      {error && <div className="sub-alert error-alert">{error}</div>}

      {/* Grid displaying Tiers */}
      <div className="subscription-tiers-grid">
        {loading ? (
          <div className="tiers-loader-card">
            <svg className="kb-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <circle cx="12" cy="12" r="10" strokeDasharray="40 20" strokeLinecap="round" />
            </svg>
            <span>Querying subscription models...</span>
          </div>
        ) : (
          <>
            {tiers.map((tier) => (
              <div 
                key={tier._id} 
                className={`subscription-tier-card ${tier.isHighlighted ? 'highlighted' : ''}`}
              >
                {/* Card Header */}
                <div className="tier-card-header">
                  <span className="tier-name">{tier.name}</span>
                  {tier.badge && (
                    <span className={`tier-badge-label ${tier.badgeClass || 'community-badge'}`}>
                      {tier.badge}
                    </span>
                  )}
                </div>

                {/* Pricing Block */}
                <div className="tier-pricing-block">
                  <span className="tier-price-val">${tier.price}</span>
                  <span className="tier-price-sub">/mo</span>
                </div>

                {/* Description if it exists */}
                {tier.description && (
                  <p className="tier-description">{tier.description}</p>
                )}

                {/* Features Checklist */}
                <ul className="tier-features-list">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="tier-feature-item">
                      <span className="checkbox-icon-wrapper">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="checkbox-check">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </span>
                      <span className="feature-text">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="tier-card-divider" />

                {/* Subscribers Count / Actions Footer */}
                <div className="tier-card-footer">
                  <div className="subscribers-count-details">
                    <span className="subscribers-lbl">SUBSCRIBERS</span>
                    <span className="subscribers-val">{(tier.subscribers || 0).toLocaleString()}</span>
                  </div>
                  
                  <div className="tier-actions-group">
                    <button 
                      className="edit-tier-btn" 
                      onClick={() => openEditModal(tier)}
                      title={`Edit ${tier.name} plan`}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                    <button 
                      className="delete-tier-btn" 
                      onClick={() => openDeleteModal(tier)}
                      title={`Delete ${tier.name} plan`}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Dash Card for Adding a New Tier */}
            <div className="subscription-tier-card add-new-tier-card" onClick={openCreateModal}>
              <div className="add-tier-dashed-content">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="add-tier-icon">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span className="add-tier-text">Add New Plan</span>
                <span className="add-tier-sub">Click to configure a new pricing tier</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Editor Modal Portal */}
      {modalMode && (modalMode === 'create' || modalMode === 'edit') && createPortal(
        <div className="sub-modal-overlay">
          <form onSubmit={handleSubmitPlan} className="sub-modal-card">
            <h3 className="sub-modal-title">
              {modalMode === 'create' ? 'Create New Subscription Plan' : `Modify ${selectedTier?.name} Plan`}
            </h3>

            <div className="sub-form-group">
              <label className="sub-input-label">Plan Name</label>
              <input 
                type="text" 
                className="sub-modal-input" 
                placeholder="e.g. Developer Plus" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="sub-form-row">
              <div className="sub-form-group half-width">
                <label className="sub-input-label">Monthly Price ($)</label>
                <input 
                  type="number" 
                  min="0"
                  className="sub-modal-input" 
                  placeholder="e.g. 19" 
                  value={price} 
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="sub-form-group half-width">
                <label className="sub-input-label">Subscriber Count</label>
                <input 
                  type="number" 
                  min="0"
                  className="sub-modal-input" 
                  placeholder="e.g. 120" 
                  value={subscribers} 
                  onChange={(e) => setSubscribers(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="sub-form-row">
              <div className="sub-form-group half-width">
                <label className="sub-input-label">Badge Label</label>
                <input 
                  type="text" 
                  className="sub-modal-input" 
                  placeholder="e.g. POPULAR, BEST VALUE" 
                  value={badge} 
                  onChange={(e) => setBadge(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="sub-form-group half-width">
                <label className="sub-input-label">Badge Class Style</label>
                <select 
                  className="sub-modal-input"
                  value={badgeClass}
                  onChange={(e) => setBadgeClass(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="community-badge">Slate/Community (Light gray)</option>
                  <option value="popular-badge">Indigo/Popular (Light blue)</option>
                  <option value="custom-badge">Cyan/Enterprise (Bright cyan)</option>
                </select>
              </div>
            </div>

            <div className="sub-form-group">
              <label className="sub-input-label">Plan Description</label>
              <textarea 
                className="sub-modal-textarea" 
                placeholder="Brief summary of plan targets..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                rows="2"
              />
            </div>

            <div className="sub-form-group">
              <label className="sub-input-label features-header">
                <span>Plan Features Checklist</span>
                <button type="button" className="add-feature-row-btn" onClick={addFeatureInput} disabled={isSubmitting}>
                  + Add Line
                </button>
              </label>

              <div className="features-inputs-container">
                {features.map((feature, idx) => (
                  <div key={idx} className="feature-input-row">
                    <input 
                      type="text" 
                      className="sub-modal-input feature-input" 
                      placeholder={`Feature #${idx + 1}`}
                      value={feature}
                      onChange={(e) => handleFeatureChange(idx, e.target.value)}
                      disabled={isSubmitting}
                    />
                    <button 
                      type="button" 
                      className="remove-feature-row-btn" 
                      onClick={() => removeFeatureInput(idx)}
                      disabled={isSubmitting}
                      title="Remove feature line"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="sub-form-group checkbox-row">
              <label className="checkbox-container">
                <input 
                  type="checkbox" 
                  checked={isHighlighted} 
                  onChange={(e) => setIsHighlighted(e.target.checked)}
                  disabled={isSubmitting}
                />
                <span className="checkbox-custom-box" />
                <span className="checkbox-label-text">Highlight Plan Card (glow outline and recommended tag)</span>
              </label>
            </div>

            <div className="sub-modal-actions">
              <button 
                type="button" 
                className="sub-modal-btn cancel" 
                onClick={() => { setModalMode(null); setSelectedTier(null); }}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="sub-modal-btn submit"
                disabled={isSubmitting || !name.trim() || price === ''}
              >
                {isSubmitting ? 'Saving...' : 'Save Plan'}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal Portal */}
      {modalMode && modalMode === 'delete' && createPortal(
        <div className="sub-modal-overlay">
          <div className="sub-modal-card confirm-delete-card">
            <h3 className="sub-modal-title delete-title">Delete Subscription Plan</h3>
            <p className="delete-warning-desc">
              Are you sure you want to permanently delete the plan <strong>"{selectedTier?.name}"</strong>? 
              This will remove the pricing plan from the MongoDB collection. Users will no longer be able to subscribe to it.
            </p>
            <div className="sub-modal-actions">
              <button 
                type="button" 
                className="sub-modal-btn cancel" 
                onClick={() => { setModalMode(null); setSelectedTier(null); }}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="sub-modal-btn submit danger" 
                onClick={handleDeletePlan}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Deleting...' : 'Delete Plan'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default SubscriptionTiers;
