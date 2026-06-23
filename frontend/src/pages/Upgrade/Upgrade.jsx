import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import './Upgrade.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Upgrade() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Promo states
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');

  const checkIcon = (
    <svg className="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 6L9 17L4 12" stroke="#00D4FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Fetch plans from DB
  useEffect(() => {
    const fetchPlans = async () => {
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
          throw new Error(data.message || 'Failed to retrieve pricing models.');
        }
        setPlans(data);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Connection to database failed.');
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleApplyPromo = async (e) => {
    e.preventDefault();
    if (!promoCode.trim()) return;

    setPromoError('');
    setPromoSuccess('');
    setAppliedPromo(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/promotions/verify?code=${promoCode.trim()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Invalid promotion code.');
      }

      setAppliedPromo(data);
      setPromoSuccess(`Promo code "${data.code}" applied successfully! (${data.value}${data.discountType === 'percentage' ? '%' : '$'} off)`);
    } catch (err) {
      setPromoError(err.message || 'Failed to verify promo code.');
    }
  };

  const handleSelectPlan = (planName) => {
    alert(`Plan Selected: ${planName}\nBilling system integrations will launch next.`);
  };

  return (
    <DashboardLayout>
      <div className="upgrade-page-wrapper">
        {/* Header Block */}
        <div className="upgrade-header-section">
          <h1 className="upgrade-page-title">Deploy Resource Upgrades</h1>
          <p className="upgrade-page-subtitle">
            Scale compute capability, AI agent pools, and SLA priority thresholds instantly.
          </p>
        </div>

        {/* Promo Verification Bar */}
        <div className="upgrade-promo-bar">
          <form onSubmit={handleApplyPromo} className="upgrade-promo-form">
            <input 
              type="text" 
              placeholder="ENTER PROMOTION CODE"
              className="upgrade-promo-input"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            />
            <button type="submit" className="upgrade-promo-btn">
              Apply Discount
            </button>
          </form>
          {promoError && <div className="upgrade-promo-msg error">{promoError}</div>}
          {promoSuccess && <div className="upgrade-promo-msg success">{promoSuccess}</div>}
        </div>

        {/* Plans Grid */}
        {loading ? (
          <div className="upgrade-loading-wrapper">
            <svg className="kb-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <circle cx="12" cy="12" r="10" strokeDasharray="40 20" strokeLinecap="round" />
            </svg>
            <span>Retrieving pricing matrices...</span>
          </div>
        ) : error ? (
          <div className="upgrade-error-banner">
            {error}
          </div>
        ) : (
          <div className="upgrade-plans-grid">
            {plans.map((plan) => {
              // Check if applied promo code is valid for this plan
              const isPromoApplicable = appliedPromo && (
                !appliedPromo.targetPlanId ||
                appliedPromo.targetPlanId === 'all' ||
                appliedPromo.targetPlanId === plan._id
              );

              const originalPrice = plan.price;
              let finalPrice = originalPrice;
              const isDiscounted = isPromoApplicable && originalPrice > 0;

              if (isDiscounted) {
                if (appliedPromo.discountType === 'percentage') {
                  finalPrice = Math.max(0, originalPrice - (originalPrice * appliedPromo.value / 100));
                } else if (appliedPromo.discountType === 'fixed') {
                  finalPrice = Math.max(0, originalPrice - appliedPromo.value);
                }
              }

              return (
                <div 
                  key={plan._id} 
                  className={`upgrade-plan-card ${plan.isHighlighted ? 'highlighted' : ''}`}
                >
                  {plan.isHighlighted && plan.badge && (
                    <div className="upgrade-badge-wrapper">
                      <span className="upgrade-badge-label">{plan.badge}</span>
                    </div>
                  )}

                  <div className="plan-card-header">
                    <span className="plan-name-label">{plan.name}</span>
                    {isDiscounted && (
                      <span className="plan-promo-tag">Applied: {appliedPromo.code}</span>
                    )}
                  </div>

                  {/* Pricing Block */}
                  <div className="plan-card-pricing">
                    {isDiscounted ? (
                      <div className="price-split-wrapper">
                        <span className="plan-price-val discounted">${finalPrice.toFixed(0)}</span>
                        <span className="plan-price-val-crossed">${originalPrice}</span>
                      </div>
                    ) : (
                      <span className="plan-price-val">${originalPrice}</span>
                    )}
                    <span className="plan-price-period">/mo</span>
                  </div>

                  {/* Plan Description */}
                  {plan.description && (
                    <p className="plan-card-desc">{plan.description}</p>
                  )}

                  <div className="plan-card-divider" />

                  {/* Features List */}
                  <ul className="plan-card-features">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="plan-feature-row">
                        <span className="plan-checkbox-icon">
                          {checkIcon}
                        </span>
                        <span className="plan-feature-text">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button 
                    onClick={() => handleSelectPlan(plan.name)} 
                    className={`plan-select-btn ${plan.isHighlighted ? 'primary' : 'outline'}`}
                  >
                    Select Plan
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default Upgrade;
