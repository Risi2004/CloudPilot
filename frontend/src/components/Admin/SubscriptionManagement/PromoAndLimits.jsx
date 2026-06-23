import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './PromoAndLimits.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function PromoAndLimits() {
  // Promotion Creator state
  const [promoCode, setPromoCode] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [value, setValue] = useState('');
  const [expiry, setExpiry] = useState('');
  const [targetPlanId, setTargetPlanId] = useState('all');
  const [plans, setPlans] = useState([]);
  const [isLaunching, setIsLaunching] = useState(false);

  // List promotions state
  const [promotions, setPromotions] = useState([]);
  const [loadingPromos, setLoadingPromos] = useState(true);

  // Modals state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetPromo, setTargetPromo] = useState(null);

  // Edit fields state
  const [editPromoCode, setEditPromoCode] = useState('');
  const [editDiscountType, setEditDiscountType] = useState('percentage');
  const [editValue, setEditValue] = useState('');
  const [editExpiry, setEditExpiry] = useState('');
  const [editTargetPlanId, setEditTargetPlanId] = useState('all');
  const [editIsActive, setEditIsActive] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Resource Limits state
  const [computeLimit, setComputeLimit] = useState(85);
  const [rateLimit, setRateLimit] = useState(2500);

  // Helper to restrict dates to today onwards
  const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    let mm = today.getMonth() + 1;
    let dd = today.getDate();
    if (dd < 10) dd = '0' + dd;
    if (mm < 10) mm = '0' + mm;
    return `${yyyy}-${mm}-${dd}`;
  };

  // Fetch plans and promotions
  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/subscriptions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setPlans(data);
      }
    } catch (err) {
      console.error('Failed to load subscription plans for Promotion Creator:', err);
    }
  };

  const fetchPromotions = async () => {
    setLoadingPromos(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/promotions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setPromotions(data);
      }
    } catch (err) {
      console.error('Failed to load promotions:', err);
    } finally {
      setLoadingPromos(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchPromotions();
  }, []);

  const handleLaunchCampaign = async (e) => {
    e.preventDefault();
    if (!promoCode || !value) return;

    setIsLaunching(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/promotions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          code: promoCode,
          discountType,
          value,
          expiry: expiry || null,
          targetPlanId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to launch promotional campaign.');
      }

      alert(`Promotion Campaign Launched Successfully!\nCode: ${data.promotion.code}\nDiscount: ${data.promotion.value}${data.promotion.discountType === 'percentage' ? '%' : '$'}\nExpiry: ${data.promotion.expiry ? new Date(data.promotion.expiry).toLocaleDateString() : 'No Expiry'}`);
      
      // Clear fields and refresh
      setPromoCode('');
      setValue('');
      setExpiry('');
      setTargetPlanId('all');
      fetchPromotions();
    } catch (err) {
      alert(`Failed to launch campaign: ${err.message}`);
    } finally {
      setIsLaunching(false);
    }
  };

  const openEditModal = (promo) => {
    setTargetPromo(promo);
    setEditPromoCode(promo.code);
    setEditDiscountType(promo.discountType);
    setEditValue(promo.value);
    
    // Format date YYYY-MM-DD
    if (promo.expiry) {
      const d = new Date(promo.expiry);
      const yyyy = d.getFullYear();
      let mm = d.getMonth() + 1;
      let dd = d.getDate();
      if (dd < 10) dd = '0' + dd;
      if (mm < 10) mm = '0' + mm;
      setEditExpiry(`${yyyy}-${mm}-${dd}`);
    } else {
      setEditExpiry('');
    }
    
    setEditTargetPlanId(promo.targetPlanId?._id || promo.targetPlanId || 'all');
    setEditIsActive(promo.isActive !== false);
    setEditModalOpen(true);
  };

  const openDeleteModal = (promo) => {
    setTargetPromo(promo);
    setDeleteModalOpen(true);
  };

  const handleEditPromoSubmit = async (e) => {
    e.preventDefault();
    if (!editPromoCode || editValue === '') return;

    setIsUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/promotions/${targetPromo._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          code: editPromoCode,
          discountType: editDiscountType,
          value: Number(editValue),
          expiry: editExpiry || null,
          targetPlanId: editTargetPlanId,
          isActive: editIsActive
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update promotion.');
      }

      setEditModalOpen(false);
      setTargetPromo(null);
      fetchPromotions();
    } catch (err) {
      alert(`Error updating promotion: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePromo = async () => {
    setIsUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/promotions/${targetPromo._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete promotion.');
      }

      setDeleteModalOpen(false);
      setTargetPromo(null);
      fetchPromotions();
    } catch (err) {
      alert(`Error deleting promotion: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePolicy = () => {
    alert(`Resource limits policy updated!\nNew Compute Threshold: ${computeLimit}%\nNew Rate Limit: ${rateLimit.toLocaleString()} req/min`);
  };

  const handleResetCounters = () => {
    setComputeLimit(80);
    setRateLimit(2000);
    alert('Resource threshold limits reset to default values.');
  };

  const getPromoStatus = (promo) => {
    if (!promo.isActive) return { label: 'Inactive', class: 'status-inactive' };
    if (promo.expiry && new Date(promo.expiry) < new Date()) {
      return { label: 'Expired', class: 'status-expired' };
    }
    return { label: 'Active', class: 'status-active' };
  };

  return (
    <div className="promo-limits-panel-wrapper">
      <div className="promo-limits-row">
        
        {/* Promotion Creator Card */}
        <div className="promo-card">
          <div className="promo-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="promo-icon">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
            <span className="promo-title">Promotion Creator</span>
          </div>

          <form onSubmit={handleLaunchCampaign} className="promo-form">
            <div className="form-row">
              <div className="form-group">
                <label className="input-label">PROMO CODE</label>
                <input 
                  type="text" 
                  value={promoCode} 
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  className="promo-input"
                  placeholder="e.g. AUTONOMY24"
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="input-label">DISCOUNT TYPE</label>
                <select 
                  value={discountType} 
                  onChange={(e) => setDiscountType(e.target.value)}
                  className="promo-select"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="input-label">VALUE</label>
                <input 
                  type="number" 
                  min="0"
                  value={value} 
                  onChange={(e) => setValue(e.target.value)}
                  className="promo-input"
                  placeholder="e.g. 25"
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="input-label">EXPIRY</label>
                <input 
                  type="date" 
                  value={expiry} 
                  onChange={(e) => setExpiry(e.target.value)}
                  className="promo-input"
                  min={getTodayDateString()}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="input-label">APPLICABLE PLAN</label>
                <select 
                  value={targetPlanId} 
                  onChange={(e) => setTargetPlanId(e.target.value)}
                  className="promo-select"
                >
                  <option value="all">All Plans</option>
                  {plans.map(plan => (
                    <option key={plan._id} value={plan._id}>{plan.name} (${plan.price}/mo)</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                {/* Spacer */}
              </div>
            </div>

            <button 
              type="submit" 
              className="promo-submit-btn" 
              disabled={isLaunching}
            >
              {isLaunching ? (
                <span className="launching-text">
                  <svg className="promo-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <circle cx="12" cy="12" r="10" strokeDasharray="40 20" strokeLinecap="round" />
                  </svg>
                  GENERATING CODE...
                </span>
              ) : 'Generate Code & Launch Campaign'}
            </button>
          </form>
        </div>

        {/* Resource Limits Card */}
        <div className="limits-card">
          <div className="limits-header">
            <div className="limits-header-left">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="limits-icon">
                <line x1="4" y1="21" x2="4" y2="14"></line>
                <line x1="4" y1="10" x2="4" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12" y2="3"></line>
                <line x1="20" y1="21" x2="20" y2="16"></line>
                <line x1="20" y1="12" x2="20" y2="3"></line>
                <line x1="1" y1="14" x2="7" y2="14"></line>
                <line x1="9" y1="8" x2="15" y2="8"></line>
                <line x1="17" y1="16" x2="23" y2="16"></line>
              </svg>
              <span className="limits-title">Resource Limits: Pro Tier</span>
            </div>
            <span className="limits-badge-label">AUTO-SCALING ENABLED</span>
          </div>

          <div className="limits-body">
            {/* Slider 1: Compute Threshold */}
            <div className="limit-slider-group">
              <div className="slider-label-row">
                <span className="slider-lbl-text">Compute Threshold</span>
                <span className="slider-lbl-val">{computeLimit}% Utilization</span>
              </div>
              <div className="slider-range-wrapper">
                <input 
                  type="range" 
                  min="50" 
                  max="100" 
                  value={computeLimit} 
                  onChange={(e) => setComputeLimit(Number(e.target.value))}
                  className="slider-range green-slider"
                />
                <div className="slider-fill green" style={{ width: `${(computeLimit - 50) * 2}%` }} />
              </div>
            </div>

            {/* Slider 2: API Rate Limit */}
            <div className="limit-slider-group">
              <div className="slider-label-row">
                <span className="slider-lbl-text">API Rate Limit</span>
                <span className="slider-lbl-val">{rateLimit.toLocaleString()} req/min</span>
              </div>
              <div className="slider-range-wrapper">
                <input 
                  type="range" 
                  min="1000" 
                  max="5000" 
                  step="250"
                  value={rateLimit} 
                  onChange={(e) => setRateLimit(Number(e.target.value))}
                  className="slider-range purple-slider"
                />
                <div className="slider-fill purple" style={{ width: `${(rateLimit - 1000) / 40}%` }} />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="limits-actions-row">
            <button onClick={handleResetCounters} className="limits-btn secondary">
              Reset Counters
            </button>
            <button onClick={handleUpdatePolicy} className="limits-btn primary">
              Update Policy
            </button>
          </div>
        </div>
      </div>

      {/* Promotions List Table section */}
      <div className="promotions-list-card">
        <div className="promo-table-header">
          <div className="promo-table-header-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="promo-icon">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
            <span className="promo-title">Active Campaign Registries</span>
          </div>
          <span className="promotions-count-badge">{promotions.length} Promo Codes</span>
        </div>

        <div className="promotions-table-wrapper">
          {loadingPromos ? (
            <div className="promotions-table-loading">
              <svg className="promo-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <circle cx="12" cy="12" r="10" strokeDasharray="40 20" strokeLinecap="round" />
              </svg>
              <span>Fetching promotion registry...</span>
            </div>
          ) : promotions.length === 0 ? (
            <div className="promotions-empty-state">
              No promotions launched yet. Generate your first code above.
            </div>
          ) : (
            <table className="promotions-table">
              <thead>
                <tr>
                  <th>Promo Code</th>
                  <th>Discount Type</th>
                  <th>Value</th>
                  <th>Expiry Date</th>
                  <th>Applicable Plan</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((promo) => {
                  const status = getPromoStatus(promo);
                  return (
                    <tr key={promo._id}>
                      <td className="promo-code-cell">{promo.code}</td>
                      <td className="promo-type-cell">
                        {promo.discountType === 'percentage' ? 'Percentage (%)' : 'Fixed Amount ($)'}
                      </td>
                      <td className="promo-val-cell">
                        {promo.discountType === 'percentage' ? `${promo.value}%` : `$${promo.value}`}
                      </td>
                      <td className="promo-expiry-cell">
                        {promo.expiry ? new Date(promo.expiry).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="promo-plan-cell">
                        {promo.targetPlanId?.name || (promo.targetPlanId ? 'Plan ID Matching' : 'All Plans')}
                      </td>
                      <td>
                        <span className={`promo-status-badge ${status.class}`}>
                          {status.label}
                        </span>
                      </td>
                      <td>
                        <div className="promo-row-actions">
                          <button 
                            className="promo-action-btn edit" 
                            title="Edit Campaign"
                            onClick={() => openEditModal(promo)}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9"></path>
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                            </svg>
                          </button>
                          <button 
                            className="promo-action-btn delete" 
                            title="Delete Campaign"
                            onClick={() => openDeleteModal(promo)}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Promotion Modal */}
      {editModalOpen && createPortal(
        <div className="promo-modal-overlay">
          <form onSubmit={handleEditPromoSubmit} className="promo-modal-card">
            <h3 className="promo-modal-title">Modify Campaign: {targetPromo?.code}</h3>
            
            <div className="promo-form-group">
              <label className="promo-input-lbl">Promo Code</label>
              <input 
                type="text" 
                className="promo-modal-input" 
                value={editPromoCode} 
                onChange={(e) => setEditPromoCode(e.target.value.toUpperCase())}
                required
                disabled={isUpdating}
              />
            </div>

            <div className="promo-form-row">
              <div className="promo-form-group half">
                <label className="promo-input-lbl">Discount Type</label>
                <select 
                  className="promo-modal-input" 
                  value={editDiscountType} 
                  onChange={(e) => setEditDiscountType(e.target.value)}
                  disabled={isUpdating}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </div>
              <div className="promo-form-group half">
                <label className="promo-input-lbl">Discount Value</label>
                <input 
                  type="number" 
                  min="0"
                  className="promo-modal-input" 
                  value={editValue} 
                  onChange={(e) => setEditValue(e.target.value)}
                  required
                  disabled={isUpdating}
                />
              </div>
            </div>

            <div className="promo-form-row">
              <div className="promo-form-group half">
                <label className="promo-input-lbl">Expiry Date</label>
                <input 
                  type="date" 
                  className="promo-modal-input" 
                  value={editExpiry} 
                  onChange={(e) => setEditExpiry(e.target.value)}
                  min={getTodayDateString()}
                  disabled={isUpdating}
                />
              </div>
              <div className="promo-form-group half">
                <label className="promo-input-lbl">Target Plan</label>
                <select 
                  className="promo-modal-input" 
                  value={editTargetPlanId} 
                  onChange={(e) => setEditTargetPlanId(e.target.value)}
                  disabled={isUpdating}
                >
                  <option value="all">All Plans</option>
                  {plans.map(p => (
                    <option key={p._id} value={p._id}>{p.name} (${p.price}/mo)</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="promo-form-group checkbox-wrapper">
              <label className="promo-checkbox-container">
                <input 
                  type="checkbox" 
                  checked={editIsActive} 
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  disabled={isUpdating}
                />
                <span className="promo-custom-box" />
                <span className="promo-checkbox-label">Keep Campaign Active</span>
              </label>
            </div>

            <div className="promo-modal-actions">
              <button 
                type="button" 
                className="promo-modal-btn cancel" 
                onClick={() => { setEditModalOpen(false); setTargetPromo(null); }}
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="promo-modal-btn submit" 
                disabled={isUpdating || !editPromoCode.trim() || editValue === ''}
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Delete Promotion Modal */}
      {deleteModalOpen && createPortal(
        <div className="promo-modal-overlay">
          <div className="promo-modal-card delete-card">
            <h3 className="promo-modal-title delete-title">Delete Promotion Code</h3>
            <p className="promo-delete-desc">
              Are you sure you want to permanently delete the campaign <strong>"{targetPromo?.code}"</strong>? 
              This will remove the code from the MongoDB database, and users will no longer be able to use it to get discounts.
            </p>
            <div className="promo-modal-actions">
              <button 
                type="button" 
                className="promo-modal-btn cancel" 
                onClick={() => { setDeleteModalOpen(false); setTargetPromo(null); }}
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="promo-modal-btn submit danger" 
                onClick={handleDeletePromo}
                disabled={isUpdating}
              >
                {isUpdating ? 'Deleting...' : 'Delete Code'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default PromoAndLimits;
