import React from 'react';
import './Pricing.css';

function Pricing() {
  const checkIcon = (
    <svg className="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 6L9 17L4 12" stroke="#00D4FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const plans = [
    {
      title: 'Free Tier',
      price: '$0',
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
      title: 'Pro Tier',
      price: '$20',
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
      title: 'Fleet Admiral',
      price: '$200',
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

  return (
    <section className="pricing" id="pricing">
      <div className="section-container">
        <h2 className="section-title">Resource Allocation</h2>
        <p className="section-subtitle">Select your mission tier and deploy your first cluster.</p>
        
        <div className="plans-grid">
          {plans.map((plan, idx) => (
            <div className={`pricing-card ${plan.highlighted ? 'highlighted' : ''}`} key={idx}>
              {plan.highlighted && plan.badge && (
                <div className="badge-wrapper">
                  <span className="recommended-badge">{plan.badge}</span>
                </div>
              )}
              
              <div className="card-top">
                <span className="plan-title">{plan.title}</span>
                <div className="price-container">
                  <span className="plan-price">{plan.price}</span>
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
          ))}
        </div>
      </div>
    </section>
  );
}

export default Pricing;
