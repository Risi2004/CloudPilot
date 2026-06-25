import React from 'react';
import './RevenueStatCards.css';

function RevenueStatCards({ stats }) {
  const mrr = stats?.mrr || '$0';
  const arr = stats?.arr || '$0';
  const ytd = stats?.totalRevenueYTD || '$0';
  const conversion = stats?.conversionRate || '0%';

  const STATS_DATA = [
    {
      id: 'mrr',
      title: 'MONTHLY RECURRING REVENUE',
      value: mrr,
      trend: stats?.mrrTrend || '+0.0%',
      isPositive: !stats?.mrrTrend?.startsWith('-'),
      progressWidth: `${stats?.mrrProgress !== undefined ? stats.mrrProgress : 0}%`,
      barClass: 'purple-gradient'
    },
    {
      id: 'arr',
      title: 'ANNUAL RECURRING REVENUE',
      value: arr,
      trend: stats?.arrTrend || '+0.0%',
      isPositive: !stats?.arrTrend?.startsWith('-'),
      progressWidth: `${stats?.arrProgress !== undefined ? stats.arrProgress : 0}%`,
      barClass: 'green-gradient'
    },
    {
      id: 'ytd',
      title: 'TOTAL REVENUE (YTD)',
      value: ytd,
      trend: stats?.ytdTrend || '+0.0%',
      isPositive: !stats?.ytdTrend?.startsWith('-'),
      progressWidth: `${stats?.ytdProgress !== undefined ? stats.ytdProgress : 0}%`,
      barClass: 'cyan-gradient'
    },
    {
      id: 'conversion',
      title: 'CONVERSION RATE',
      value: conversion,
      trend: stats?.conversionTrend || '+0.0%',
      isPositive: !stats?.conversionTrend?.startsWith('-'),
      progressWidth: `${stats?.conversionProgress !== undefined ? stats.conversionProgress : 0}%`,
      barClass: 'purple-blue-gradient'
    }
  ];

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
