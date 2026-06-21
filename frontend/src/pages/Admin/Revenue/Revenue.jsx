import React, { useState } from 'react';
import './Revenue.css';

// Layout and widgets
import AdminSidebar from '../../../components/Admin/AdminDashboard/AdminSidebar';
import RevenueStatCards from '../../../components/Admin/Revenue/RevenueStatCards';
import RevenueTrendChart from '../../../components/Admin/Revenue/RevenueTrendChart';
import PlanBreakdown from '../../../components/Admin/Revenue/PlanBreakdown';
import AcquisitionVolume from '../../../components/Admin/Revenue/AcquisitionVolume';
import RecentTransactions from '../../../components/Admin/Revenue/RecentTransactions';

function Revenue() {
  const [timeframe, setTimeframe] = useState('30d');

  const handleExportCSV = () => {
    alert('Preparing transaction data exports...\nCSV download will begin shortly.');
  };

  return (
    <div className="admin-dashboard-container">
      {/* Left Sidebar */}
      <AdminSidebar activeTab="revenue" />

      {/* Right Content Area */}
      <main className="admin-dashboard-main">
        <div className="admin-subview">
          
          {/* Header Row */}
          <div className="revenue-header-row">
            <div className="header-left">
              <h1 className="revenue-page-title">Revenue Analytics</h1>
              <p className="revenue-page-subtitle">
                Financial health monitoring and predictive growth tracking.
              </p>
            </div>
            
            <div className="header-right">
              {/* Timeframe Dropdown */}
              <div className="timeframe-selector-wrapper">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="calendar-icon">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <select 
                  className="timeframe-select"
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                >
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="12m">Last 12 Months</option>
                </select>
              </div>
              
              {/* Export CSV Trigger */}
              <button 
                className="revenue-export-btn"
                onClick={handleExportCSV}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="btn-icon">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Export CSV
              </button>
            </div>
          </div>

          {/* Stats Section */}
          <RevenueStatCards />

          {/* Middle Row: Trend Line Chart and Plan Breakdown Circle */}
          <div className="revenue-middle-row">
            <div className="middle-col-chart">
              <RevenueTrendChart />
            </div>
            <div className="middle-col-donut">
              <PlanBreakdown />
            </div>
          </div>

          {/* Daily Acquisition Bar Chart */}
          <div className="revenue-bar-row">
            <AcquisitionVolume />
          </div>

          {/* Transaction History Section */}
          <div className="revenue-table-row">
            <RecentTransactions />
          </div>

        </div>
      </main>
    </div>
  );
}

export default Revenue;
