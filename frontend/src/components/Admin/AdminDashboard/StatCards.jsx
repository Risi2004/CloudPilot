import React from 'react';
import './StatCards.css';

// SVG Assets
import usersIcon from '../../../assets/users.svg';
import activeProjectsIcon from '../../../assets/active-projects.svg';
import deploymentsIcon from '../../../assets/deployments.svg';
import subscriptionsIcon from '../../../assets/subscriptions-admin.svg'; // Uptime/badge-check
import revenueIcon from '../../../assets/subscriptions.svg'; // Card
import aiRequestsIcon from '../../../assets/ai-reccomendations.svg'; // Sparkles

const CARDS_DATA = [
  {
    id: 'total-users',
    title: 'TOTAL USERS',
    value: '42,892',
    icon: usersIcon,
    subtext: '+12% this month',
    subtextClass: 'trend-positive',
    glowColor: 'rgba(0, 212, 255, 0.15)'
  },
  {
    id: 'active-projects',
    title: 'ACTIVE PROJECTS',
    value: '1,402',
    icon: activeProjectsIcon,
    subtext: '84 Pending Sync',
    subtextClass: 'trend-neutral',
    glowColor: 'rgba(123, 208, 255, 0.15)'
  },
  {
    id: 'deployments',
    title: 'DEPLOYMENTS',
    value: '8,931',
    icon: deploymentsIcon,
    subtext: '98% success rate',
    subtextClass: 'trend-positive',
    glowColor: 'rgba(192, 193, 255, 0.15)'
  },
  {
    id: 'subscriptions',
    title: 'SUBSCRIPTIONS',
    value: '3,120',
    icon: subscriptionsIcon,
    subtext: 'Enterprise: 450',
    subtextClass: 'trend-neutral',
    glowColor: 'rgba(78, 222, 163, 0.15)'
  },
  {
    id: 'monthly-revenue',
    title: 'MONTHLY REVENUE',
    value: '$1.2M',
    icon: revenueIcon,
    subtext: '+8.4%',
    subtextClass: 'trend-positive',
    glowColor: 'rgba(215, 196, 215, 0.15)'
  },
  {
    id: 'ai-requests',
    title: 'AI REQUESTS',
    value: '1.4B',
    icon: aiRequestsIcon,
    subtext: '45ms Avg Latency',
    subtextClass: 'trend-neutral',
    glowColor: 'rgba(192, 193, 255, 0.15)'
  }
];

function StatCards() {
  return (
    <div className="stat-cards-grid">
      {CARDS_DATA.map((card) => (
        <div 
          key={card.id} 
          className="stat-card"
          style={{ '--card-glow': card.glowColor }}
        >
          <div className="stat-card-header">
            <span className="stat-card-title">{card.title}</span>
            <div className="stat-card-icon-wrapper">
              <img src={card.icon} alt={card.title} className="stat-card-icon" />
            </div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-value">{card.value}</span>
            <span className={`stat-card-subtext ${card.subtextClass}`}>{card.subtext}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default StatCards;
