import React from 'react';
import './AuditFilters.css';

// SVG Icons from Assets
import dateIcon from '../../../assets/date.svg';
import categoryIcon from '../../../assets/event category.svg';
import userIcon from '../../../assets/user.svg';
import severityIcon from '../../../assets/Alerts.svg';

function AuditFilters({ filters, onChangeFilter }) {
  return (
    <div className="audit-filters-row">
      {/* Date Range Card */}
      <div className="filter-card">
        <img src={dateIcon} alt="Date Range" className="filter-card-icon" />
        <div className="filter-card-content">
          <span className="filter-card-label">DATE RANGE</span>
          <select
            className="filter-card-select"
            value={filters.dateRange}
            onChange={(e) => onChangeFilter('dateRange', e.target.value)}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Event Category Card */}
      <div className="filter-card">
        <img src={categoryIcon} alt="Event Category" className="filter-card-icon" />
        <div className="filter-card-content">
          <span className="filter-card-label">EVENT CATEGORY</span>
          <select
            className="filter-card-select"
            value={filters.category}
            onChange={(e) => onChangeFilter('category', e.target.value)}
          >
            <option value="all">All Events</option>
            <option value="Authentication">Authentication</option>
            <option value="Compute Scaling">Compute Scaling</option>
            <option value="Access Control">Access Control</option>
            <option value="Deployment">Deployment</option>
          </select>
        </div>
      </div>

      {/* Admin User Card */}
      <div className="filter-card">
        <img src={userIcon} alt="Admin User" className="filter-card-icon" />
        <div className="filter-card-content">
          <span className="filter-card-label">ADMIN USER</span>
          <select
            className="filter-card-select"
            value={filters.adminUser}
            onChange={(e) => onChangeFilter('adminUser', e.target.value)}
          >
            <option value="all">Any User</option>
            <option value="admin@cloudpilot.ai">admin@cloudpilot.ai</option>
            <option value="Sarah Jenkins">Sarah Jenkins</option>
            <option value="System">System</option>
            <option value="Deployment Bot">Deployment Bot</option>
          </select>
        </div>
      </div>

      {/* Severity Card */}
      <div className="filter-card">
        <img src={severityIcon} alt="Severity" className="filter-card-icon" />
        <div className="filter-card-content">
          <span className="filter-card-label">SEVERITY</span>
          <select
            className="filter-card-select"
            value={filters.severity}
            onChange={(e) => onChangeFilter('severity', e.target.value)}
          >
            <option value="all">All Levels</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default AuditFilters;
