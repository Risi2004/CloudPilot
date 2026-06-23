import React, { useState, useEffect } from 'react';
import './Pricing.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const STATIC_FALLBACK_PLANS = [
  {
    id: 'fallback-free',
    title: 'Free Tier',
    price: 0,
    period: '/month',
    features: [
      '1 Active cluster',
      'Basic monitoring',
      'Git-integrated pipelines',
      'Single cloud provider',
      'Community support'
    ],
    buttonText: 'Get Started',
    highlighted: false
  },
  {
    id: 'fallback-pro',
    title: 'Pro Tier',
    price: 20,
    period: '/month',
    features: [
      'Cost optimization',
      'Incident response',
      'Security agent',
      'Advanced monitoring',
      'Priority support'
    ],
    buttonText: 'Start Free Trial',
    highlighted: true,
    badge: 'HIGHLY RECOMMENDED'
  },
  {
    id: 'fallback-fleet',
    title: 'Fleet Admiral',
    price: 200,
    period: '/month',
    features: [
      'Multi-cloud support',
      'AI-powered SRE',
      'Custom integrations',
      'Dedicated support',
      'Advanced security controls'
    ],
    buttonText: 'Contact Sales',
    highlighted: false
  }
];

function Pricing() {
  const [plansList, setPlansList] = useState(STATIC_FALLBACK_PLANS);
  
  // Promo states
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState('');

  const checkIcon = (
    <svg className="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 6L9 17L4 12" stroke="#00D4FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const res = await fetch(`${API_URL}/api/subscriptions`);
        if (!res.ok) throw new Error('Failed to load plans');
        const data = await res.json();
        
        if (data && data.length > 0) {
          const mappedPlans = data.map(plan => {
            let buttonText = 'Start Free Trial';
            if (plan.price === 0) {
              buttonText = 'Get Started';
            } else if (plan.price >= 200) {
              buttonText = 'Contact Sales';
            }
            
            // Format name nicely
            let formattedTitle = plan.name;
            const titleLower = plan.name.toLowerCase();
            if (!titleLower.includes('tier') && !titleLower.includes('admiral') && !titleLower.includes('plan')) {
              formattedTitle = `${plan.name} Tier`;
            }

            return {
              id: plan._id,
              title: formattedTitle,
              price: plan.price,
              period: '/month',
              features: plan.features,
              buttonText,
              highlighted: !!plan.isHighlighted,
              badge: plan.badge
            };
          });
          setPlansList(mappedPlans);
        }
      } catch (err) {
        console.warn('Could not fetch subscription plans from DB, using fallback static content.', err);
      }
    };
    
    loadPlans();
  }, []);

  const handleApplyPromo = async (e) => {
    e.preventDefault();
    if (!promoInput.trim()) return;

    setPromoError('');
    setAppliedPromo(null);

    try {
      const res = await fetch(`${API_URL}/api/promotions/verify?code=${promoInput.trim()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Invalid promotion code.');
      }

      setAppliedPromo(data);
    } catch (err) {
      setPromoError(err.message || 'Error verifying promo code.');
    }
  };

  return (
    <section className="pricing" id="pricing">
      <div className="section-container">
        <h2 className="section-title">Resource Allocation</h2>
        <p className="section-subtitle">Select your mission tier and deploy your first cluster.</p>
        
        {/* Promo code entry bar */}
        <div className="promo-entry-bar">
          <form onSubmit={handleApplyPromo} className="promo-input-wrapper">
            <input 
              type="text" 
              placeholder="Enter Promo Code"
              className="promo-code-field"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
            />
            <button type="submit" className="promo-apply-btn">
              Apply Code
            </button>
          </form>
          {promoError && <div className="promo-status-msg error">{promoError}</div>}
          {appliedPromo && (
            <div className="promo-status-msg success">
              Campaign applied! Code <strong>{appliedPromo.code}</strong> yields {appliedPromo.value}{appliedPromo.discountType === 'percentage' ? '%' : '$'} off select tiers.
            </div>
          )}
        </div>

        <div className="plans-grid">
          {plansList.map((plan, idx) => {
            // Check if promo is applicable to this plan
            // (appliedPromo.targetPlanId equals null/undefined means it targets all plans)
            const isPromoApplicable = appliedPromo && (
              !appliedPromo.targetPlanId ||
              appliedPromo.targetPlanId === 'all' ||
              appliedPromo.targetPlanId === plan.id
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
              <div className={`pricing-card ${plan.highlighted ? 'highlighted' : ''}`} key={idx}>
                {plan.highlighted && plan.badge && (
                  <div className="badge-wrapper">
                    <span className="recommended-badge">{plan.badge}</span>
                  </div>
                )}
                
                <div className="card-top">
                  <span className="plan-title">
                    {plan.title}
                    {isDiscounted && (
                      <span className="promo-applied-badge">Code: {appliedPromo.code}</span>
                    )}
                  </span>
                  <div className="price-container">
                    {isDiscounted ? (
                      <>
                        <span className="plan-price discounted">${finalPrice.toFixed(0)}</span>
                        <span className="plan-price-crossed">${originalPrice}</span>
                      </>
                    ) : (
                      <span className="plan-price">${originalPrice}</span>
                    )}
                    <span className="plan-period">{plan.period}</span>
                  </div>
                </div>
                
                <ul className="features-list">
                  {plan.features.map((feature, fIdx) => (
                    <li className="feature-item" key={fIdx}>
                      {checkIcon}
                      <span className="feature-text">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="card-bottom">
                  <button className={`plan-btn ${plan.highlighted ? 'btn-primary' : 'btn-outline'}`}>
                    {plan.buttonText}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Pricing;
