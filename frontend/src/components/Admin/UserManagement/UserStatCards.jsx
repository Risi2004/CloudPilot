import React from 'react';
import './UserStatCards.css';

// SVG Assets
import totalUsersIcon from '../../../assets/total-users.svg';
import newUsersIcon from '../../../assets/new-users.svg';
import activeUsersIcon from '../../../assets/active-users.svg';
import growthIcon from '../../../assets/growth.svg';

function UserStatCards() {
  return (
    <div className="user-stats-grid">
      
      {/* Total Users */}
      <div className="user-stat-card total-users-card">
        <div className="user-stat-icon-wrapper blue-purple-bg">
          <img src={totalUsersIcon} alt="Total Users" className="user-stat-icon-img" />
        </div>
        <div className="user-stat-details">
          <span className="user-stat-title">TOTAL USERS</span>
          <span className="user-stat-value">12,842</span>
          <span className="user-stat-trend trend-positive">
            <span className="arrow">↗</span> +12% from last month
          </span>
        </div>
      </div>

      {/* New Users */}
      <div className="user-stat-card new-users-card">
        <div className="user-stat-icon-wrapper green-bg">
          <img src={newUsersIcon} alt="New Users" className="user-stat-icon-img" />
        </div>
        <div className="user-stat-details">
          <span className="user-stat-title">NEW USERS (24H)</span>
          <span className="user-stat-value">148</span>
          <span className="user-stat-trend trend-positive">
            <img src={growthIcon} alt="Growth" className="trend-growth-icon" /> High growth period
          </span>
        </div>
      </div>

      {/* Active Users */}
      <div className="user-stat-card active-users-card">
        <div className="user-stat-icon-wrapper blue-bg">
          <img src={activeUsersIcon} alt="Active Users" className="user-stat-icon-img" style={{ width: '24px', height: '24px' }} />
        </div>
        <div className="user-stat-details">
          <span className="user-stat-title">ACTIVE USERS</span>
          <span className="user-stat-value">8,291</span>
          <span className="user-stat-trend trend-positive">
            <span className="dot" /> 64% retention rate
          </span>
        </div>
      </div>

    </div>
  );
}

export default UserStatCards;
