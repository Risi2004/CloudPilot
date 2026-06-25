import React, { useState, useEffect } from 'react';
import './Revenue.css';

// Layout and widgets
import AdminSidebar from '../../../components/Admin/AdminDashboard/AdminSidebar';
import RevenueStatCards from '../../../components/Admin/Revenue/RevenueStatCards';
import RevenueTrendChart from '../../../components/Admin/Revenue/RevenueTrendChart';
import PlanBreakdown from '../../../components/Admin/Revenue/PlanBreakdown';
import AcquisitionVolume from '../../../components/Admin/Revenue/AcquisitionVolume';
import RecentTransactions from '../../../components/Admin/Revenue/RecentTransactions';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Revenue() {
  const [timeframe, setTimeframe] = useState('30d');
  const [revenueData, setRevenueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRevenueData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/revenue/stats?timeframe=${timeframe}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setRevenueData(data);
      } else {
        setError(data.message || 'Failed to fetch revenue analytics.');
      }
    } catch (e) {
      console.error('Error fetching revenue data:', e);
      setError('Connection to server failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenueData();
  }, [timeframe]);

  const handleExportCSV = () => {
    if (!revenueData || !revenueData.recentTransactions) return;
    
    // Construct CSV headers & rows
    const headers = ['Transaction ID', 'Customer Name', 'Email', 'Plan Purchased', 'Amount', 'Status', 'Date'];
    const rows = revenueData.recentTransactions.map(tx => [
      tx.orderId,
      tx.name,
      tx.email,
      tx.plan,
      tx.amount,
      tx.status,
      new Date(tx.date).toLocaleDateString()
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cloudpilot_revenue_report_${timeframe}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                disabled={loading || !revenueData}
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

          {error && <div className="revenue-error-banner">{error}</div>}

          {loading ? (
            <div className="revenue-loading-overlay">
              <div className="revenue-spinner" />
              <span>Fetching financial ledger data...</span>
            </div>
          ) : (
            <>
              {/* Stats Section */}
              <RevenueStatCards stats={revenueData?.stats} />

              {/* Middle Row: Trend Line Chart and Plan Breakdown Circle */}
              <div className="revenue-middle-row">
                <div className="middle-col-chart">
                  <RevenueTrendChart trendData={revenueData?.trendChart} />
                </div>
                <div className="middle-col-donut">
                  <PlanBreakdown planData={revenueData?.planBreakdown} stats={revenueData?.stats} />
                </div>
              </div>

              {/* Daily Acquisition Bar Chart */}
              <div className="revenue-bar-row">
                <AcquisitionVolume acquisitionData={revenueData?.acquisitionVolume} />
              </div>

              {/* Transaction History Section */}
              <div className="revenue-table-row">
                <RecentTransactions transactions={revenueData?.recentTransactions} />
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  );
}

export default Revenue;
