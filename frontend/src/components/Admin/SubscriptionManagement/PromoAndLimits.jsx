import React, { useState } from 'react';
import './PromoAndLimits.css';

function PromoAndLimits() {
  // Promotion Creator state
  const [promoCode, setPromoCode] = useState('AUTONOMY24');
  const [discountType, setDiscountType] = useState('percentage');
  const [value, setValue] = useState('25');
  const [expiry, setExpiry] = useState('');
  const [isLaunching, setIsLaunching] = useState(false);

  // Resource Limits state
  const [computeLimit, setComputeLimit] = useState(85);
  const [rateLimit, setRateLimit] = useState(2500);

  const handleLaunchCampaign = (e) => {
    e.preventDefault();
    if (!promoCode || !value) return;

    setIsLaunching(true);
    setTimeout(() => {
      setIsLaunching(false);
      alert(`Promotion Campaign Launched Successfully!\nCode: ${promoCode}\nDiscount: ${value}${discountType === 'percentage' ? '%' : '$'}\nExpiry: ${expiry || 'No Expiry'}`);
    }, 1500);
  };

  const handleUpdatePolicy = () => {
    alert(`Resource limits policy updated!\nNew Compute Threshold: ${computeLimit}%\nNew Rate Limit: ${rateLimit.toLocaleString()} req/min`);
  };

  const handleResetCounters = () => {
    setComputeLimit(80);
    setRateLimit(2000);
    alert('Resource threshold limits reset to default values.');
  };

  return (
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
                type="text" 
                value={value} 
                onChange={(e) => setValue(e.target.value)}
                className="promo-input"
              />
            </div>
            
            <div className="form-group">
              <label className="input-label">EXPIRY</label>
              <input 
                type="date" 
                value={expiry} 
                onChange={(e) => setExpiry(e.target.value)}
                className="promo-input"
              />
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
  );
}

export default PromoAndLimits;
