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

  // User and subscription details state
  const [currentUser, setCurrentUser] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState(null);
  const [checkoutBillingCycle, setCheckoutBillingCycle] = useState('monthly');
  const [checkoutAutoRenew, setCheckoutAutoRenew] = useState(true);

  const checkIcon = (
    <svg className="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 6L9 17L4 12" stroke="#00D4FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Load PayHere script and fetch plans from DB
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://www.payhere.lk/lib/payhere.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${API_URL}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error('Error verifying user:', err);
    }
  };

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
    fetchUser();
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

  const handleCancelSubscription = async () => {
    if (!window.confirm("Are you sure you want to cancel your subscription auto-renewal? There will be no refund process, but your plan features will remain active until the end of your chosen cycle.")) {
      return;
    }
    setCancelling(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/subscriptions/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchUser(); // Refresh user details
        window.dispatchEvent(new Event('profileUpdate')); // Sync navbar badge instantly
      } else {
        alert(data.message || 'Failed to cancel subscription renewal.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to subscription systems.');
    } finally {
      setCancelling(false);
    }
  };

  const handleSelectPlan = async (plan) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to upgrade your plan.');
      return;
    }

    if (plan.price === 0) {
      // Free plan - no checkout required
      try {
        const res = await fetch(`${API_URL}/api/payments/subscribe-free`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ planId: plan._id })
        });
        const data = await res.json();
        if (res.ok) {
          alert(`Successfully subscribed to ${plan.name} plan!`);
          window.location.href = '/dashboard';
        } else {
          alert(data.message || 'Failed to subscribe to Free plan.');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to subscribe to Free plan.');
      }
    } else {
      // Open checkout selection modal
      setSelectedPlanForCheckout(plan);
      setCheckoutBillingCycle('monthly');
      setCheckoutAutoRenew(true);
    }
  };

  const proceedToCheckout = async (plan, cycle, autoRenew) => {
    setSelectedPlanForCheckout(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to upgrade your plan.');
        return;
      }

      // Paid plan - call PayHere initiation endpoint with cycle and autoRenew params
      const res = await fetch(`${API_URL}/api/payments/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          planId: plan._id,
          promoCode: appliedPromo ? appliedPromo.code : undefined,
          billingCycle: cycle,
          autoRenew: autoRenew
        })
      });
      const payConfig = await res.json();
      if (!res.ok) {
        throw new Error(payConfig.message || 'Failed to initiate payment.');
      }

      // Configure callback events for PayHere
      window.payhere.onCompleted = async function onCompleted(orderId) {
        try {
          // Call local confirm endpoint to save the user's plan to DB instantly (local dev webhook fallback)
          const confirmRes = await fetch(`${API_URL}/api/payments/confirm`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
              orderId, 
              planId: plan._id,
              billingCycle: cycle,
              autoRenew: autoRenew
            })
          });
          
          if (confirmRes.ok) {
            const data = await confirmRes.json();
            if (data.plan) {
              localStorage.setItem('plan', data.plan);
            }
          }
        } catch (err) {
          console.error('Error confirmation local payment save:', err);
        }
        alert(`Payment Successful! Your subscription is being activated.`);
        window.location.href = '/dashboard?payment=success';
      };

      window.payhere.onDismissed = function onDismissed() {
        console.log('Payment checkout popup closed by user.');
      };

      window.payhere.onError = function onError(error) {
        alert(`Billing error encountered: ${error}`);
      };

      // Start PayHere popup payment
      window.payhere.startPayment(payConfig);
    } catch (err) {
      console.error('Payment initiation error:', err);
      alert(err.message || 'Billing systems are currently offline. Please try again.');
    }
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

        {currentUser && currentUser.plan !== 'Free' && (
          <div className="active-subscription-banner">
            <div className="banner-details">
              <span className="banner-badge">Active Plan</span>
              <h2>{currentUser.plan} ({currentUser.billingCycle === 'annually' ? 'Annually' : 'Monthly'})</h2>
              <p>
                {currentUser.autoRenew ? (
                  <>Auto-renews on: <strong>{currentUser.subscriptionExpiresAt ? new Date(currentUser.subscriptionExpiresAt).toLocaleDateString() : 'N/A'}</strong></>
                ) : (
                  <>Expires on: <strong>{currentUser.subscriptionExpiresAt ? new Date(currentUser.subscriptionExpiresAt).toLocaleDateString() : 'N/A'}</strong> (Auto-renewal turned off)</>
                )}
              </p>
            </div>
            {currentUser.autoRenew && (
              <button 
                className="cancel-renewal-btn"
                onClick={handleCancelSubscription}
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling...' : 'Cancel Auto-Renewal'}
              </button>
            )}
          </div>
        )}

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

              const isCurrentPlan = currentUser && currentUser.plan === plan.name;

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
                        <span className="plan-price-val discounted">
                          $
                          <span className={finalPrice === 0 && currentUser && currentUser.plan !== 'Free' ? 'blur-price' : ''}>
                            {finalPrice.toFixed(0)}
                          </span>
                        </span>
                        <span className="plan-price-val-crossed">${originalPrice}</span>
                      </div>
                    ) : (
                      <span className="plan-price-val">
                        $
                        <span className={originalPrice === 0 && currentUser && currentUser.plan !== 'Free' ? 'blur-price' : ''}>
                          {originalPrice}
                        </span>
                      </span>
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
                    onClick={() => !isCurrentPlan && handleSelectPlan(plan)} 
                    className={`plan-select-btn ${plan.isHighlighted ? 'primary' : 'outline'} ${isCurrentPlan ? 'current-active' : ''}`}
                    disabled={isCurrentPlan}
                  >
                    {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Checkout Modal Overlay */}
        {selectedPlanForCheckout && (
          <div className="checkout-modal-overlay">
            <div className="checkout-modal">
              <h2>Select Subscription Billing Options</h2>
              
              <div className="modal-plan-summary">
                <span className="modal-plan-name">{selectedPlanForCheckout.name} Plan</span>
                <span className="modal-plan-price">
                  {checkoutBillingCycle === 'annually' 
                    ? `$${(selectedPlanForCheckout.price * 12 * 0.8).toFixed(0)}/yr` 
                    : `$${selectedPlanForCheckout.price}/mo`
                  }
                </span>
              </div>

              <div className="option-group">
                <span className="option-label">Choose Billing Cycle</span>
                <div className="billing-options-grid">
                  <div 
                    className={`billing-opt-card ${checkoutBillingCycle === 'monthly' ? 'selected' : ''}`}
                    onClick={() => setCheckoutBillingCycle('monthly')}
                  >
                    <span className="cycle-title">Monthly</span>
                    <span className="cycle-price">${selectedPlanForCheckout.price}/month</span>
                  </div>
                  <div 
                    className={`billing-opt-card ${checkoutBillingCycle === 'annually' ? 'selected' : ''}`}
                    onClick={() => setCheckoutBillingCycle('annually')}
                  >
                    <span className="cycle-title">Annually</span>
                    <span className="cycle-price">${(selectedPlanForCheckout.price * 12 * 0.8 / 12).toFixed(0)}/mo equivalent</span>
                    <span className="discount-badge">Save 20%</span>
                  </div>
                </div>
              </div>

              <div className="auto-renew-row">
                <div className="auto-renew-details">
                  <span className="auto-renew-title">Enable Auto-Renewal</span>
                  <span className="auto-renew-desc">Automatically renew subscription when period ends</span>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={checkoutAutoRenew}
                    onChange={(e) => setCheckoutAutoRenew(e.target.checked)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              <div className="policy-alert-box">
                <span className="policy-alert-icon">⚠️</span>
                <span className="policy-alert-text">
                  Subscriptions are non-refundable. If cancelled or auto-renewal is turned off, active features will remain active until the end of your billing cycle.
                </span>
              </div>

              <div className="modal-actions">
                <button 
                  className="modal-cancel-btn"
                  onClick={() => setSelectedPlanForCheckout(null)}
                >
                  Cancel
                </button>
                <button 
                  className="modal-confirm-btn"
                  onClick={() => proceedToCheckout(selectedPlanForCheckout, checkoutBillingCycle, checkoutAutoRenew)}
                >
                  Proceed to Payment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default Upgrade;
