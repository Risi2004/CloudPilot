import React from 'react';
import './SubscriptionManagement.css';

// Layout and widgets
import AdminSidebar from '../../../components/Admin/AdminDashboard/AdminSidebar';
import SubscriptionTiers from '../../../components/Admin/SubscriptionManagement/SubscriptionTiers';
import PromoAndLimits from '../../../components/Admin/SubscriptionManagement/PromoAndLimits';
import TopSubscribers from '../../../components/Admin/SubscriptionManagement/TopSubscribers';

function SubscriptionManagement() {
  return (
    <div className="admin-dashboard-container">
      {/* Left Sidebar */}
      <AdminSidebar activeTab="subscriptions" />

      {/* Right Content Area */}
      <main className="admin-dashboard-main">
        <div className="admin-subview">
          
          {/* Header Row */}
          <div className="sub-management-header">
            <div className="sub-header-left">
              <h1 className="sub-management-title">Subscription Management</h1>
              <p className="sub-management-subtitle">
                Configure tiers, pricing strategies, and active promotion cycles.
              </p>
            </div>
            
            <div className="sub-header-right">
              {/* Billing System Status Indicator */}
              <div className="billing-status-banner">
                <span className="billing-status-dot" />
                <span className="billing-status-text">BILLING SYSTEM ACTIVE</span>
              </div>
            </div>
          </div>

          {/* Pricing Tiers Section */}
          <SubscriptionTiers />

          {/* Promotion & Resource Policy Section */}
          <PromoAndLimits />

          {/* Top Subscribers list Section */}
          <TopSubscribers />

        </div>
      </main>
    </div>
  );
}

export default SubscriptionManagement;
