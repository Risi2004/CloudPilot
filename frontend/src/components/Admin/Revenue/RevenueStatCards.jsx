import React from 'react';
import './RevenueStatCards.css';

const STATS_DATA = [
  {
    id: 'mrr',
    title: 'MONTHLY RECURRING REVENUE',
    value: '$482.9k',
    trend: '+12.4%',
    isPositive: true,
    progressWidth: '78%',
    barClass: 'purple-gradient'
  },
  {
    id: 'arr',
    title: 'ANNUAL RECURRING REVENUE',
    value: '$5.8M',
    trend: '+8.1%',
    isPositive: true,
    progressWidth: '64%',
    barClass: 'green-gradient'
  },
  {
    id: 'ytd',
    title: 'TOTAL REVENUE (YTD)',
    value: '$3.2M',
    trend: '-2.3%',
    isPositive: false,
    progressWidth: '82%',
    barClass: 'cyan-gradient'
  },
  {
    id: 'conversion',
    title: 'CONVERSION RATE',
    value: '24.8%',
    trend: '+4.1%',
    isPositive: true,
    progressWidth: '55%',
    barClass: 'purple-blue-gradient'
  }
];

function RevenueStatCards() {
  return (
    <div className="revenue-stats-grid">
      {STATS_DATA.map((stat) => (
        <div key={stat.id} className="revenue-stat-card">
          <div className="stat-card-header">
            <span className="stat-title">{stat.title}</span>
            <span className={`stat-trend-badge ${stat.isPositive ? 'trend-up' : 'trend-down'}`}>
              <span className="trend-arrow">{stat.isPositive ? '↗' : '↘'}</span>
              {stat.trend}
            </span>
          </div>
          <div className="stat-value">{stat.value}</div>
          <div className="stat-progress-container">
            <div 
              className={`stat-progress-bar ${stat.barClass}`} 
              style={{ width: stat.progressWidth }} 
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default RevenueStatCards;
