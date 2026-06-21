import React, { useState } from 'react';
import './SubscriptionTiers.css';

const INITIAL_TIERS = [
  {
    id: 'free',
    name: 'Free',
    badge: 'COMMUNITY',
    price: '$0',
    features: [
      'Up to 3 AI Agents',
      '500 Global Requests',
      'Shared Knowledge Base'
    ],
    subscribers: 12482,
    badgeClass: 'community-badge'
  },
  {
    id: 'pro',
    name: 'Pro',
    badge: 'POPULAR',
    price: '$49',
    features: [
      'Unlimited AI Agents',
      'Priority Execution',
      '10GB Private Knowledge Base',
      'SLA: 99.9% Uptime'
    ],
    subscribers: 4210,
    badgeClass: 'popular-badge',
    isHighlighted: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    badge: 'CUSTOM',
    price: '$299',
    features: [
      'Dedicated Infrastructure',
      'White-label Options',
      'Custom Security Audit'
    ],
    subscribers: 184,
    badgeClass: 'custom-badge'
  }
];

function SubscriptionTiers() {
  const [tiers, setTiers] = useState(INITIAL_TIERS);

  const handleEditSubscribers = (id) => {
    const tier = tiers.find(t => t.id === id);
    const newCountStr = prompt(`Enter new subscriber count for ${tier.name}:`, tier.subscribers);
    const newCount = parseInt(newCountStr, 10);
    
    if (!isNaN(newCount)) {
      setTiers(tiers.map(t => {
        if (t.id === id) {
          return { ...t, subscribers: newCount };
        }
        return t;
      }));
    }
  };

  return (
    <div className="subscription-tiers-grid">
      {tiers.map((tier) => (
        <div 
          key={tier.id} 
          className={`subscription-tier-card ${tier.isHighlighted ? 'highlighted' : ''}`}
        >
          {/* Card Header */}
          <div className="tier-card-header">
            <span className="tier-name">{tier.name}</span>
            <span className={`tier-badge-label ${tier.badgeClass}`}>
              {tier.badge}
            </span>
          </div>

          {/* Pricing Block */}
          <div className="tier-pricing-block">
            <span className="tier-price-val">{tier.price}</span>
            <span className="tier-price-sub">/mo</span>
          </div>

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

          {/* Subscribers Count / Action Footer */}
          <div className="tier-card-footer">
            <div className="subscribers-count-details">
              <span className="subscribers-lbl">SUBSCRIBERS</span>
              <span className="subscribers-val">{tier.subscribers.toLocaleString()}</span>
            </div>
            
            <button 
              className="edit-tier-btn" 
              onClick={() => handleEditSubscribers(tier.id)}
              title={`Edit ${tier.name} subscriber count`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default SubscriptionTiers;
