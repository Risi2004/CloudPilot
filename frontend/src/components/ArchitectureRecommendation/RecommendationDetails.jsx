import React, { useState } from 'react';
import './RecommendationDetails.css';

function RecommendationDetails() {
  const [activeDetailTab, setActiveDetailTab] = useState('database');

  const renderDetailsContent = () => {
    switch (activeDetailTab) {
      case 'database':
        return (
          <div className="spec-content-box">
            <h4 className="spec-section-header">DATABASE ARCHITECTURE PLAN</h4>
            <p className="spec-section-desc">
              Recommended database configuration optimized for read-heavy API traffic and transaction persistence.
            </p>
            <div className="spec-rows-list">
              <div className="spec-detail-row">
                <span className="spec-row-key">Database Engine</span>
                <span className="spec-row-val font-mono">PostgreSQL v15 (Amazon RDS)</span>
              </div>
              <div className="spec-detail-row">
                <span className="spec-row-key">Sizing & Class</span>
                <span className="spec-row-val font-mono">db.t4g.micro (2 vCPU, 1 GB RAM, Burstable)</span>
              </div>
              <div className="spec-detail-row">
                <span className="spec-row-key">Storage Provisioning</span>
                <span className="spec-row-val">20 GB gp3 SSD (Autoscaling up to 100 GB enabled)</span>
              </div>
              <div className="spec-detail-row">
                <span className="spec-row-key">High Availability</span>
                <span className="spec-row-val">Single-AZ deployment (Multi-AZ suggested for prod tier)</span>
              </div>
              <div className="spec-detail-row">
                <span className="spec-row-key">Backup Rules</span>
                <span className="spec-row-val">7-day automatic retention, daily snapshots at 03:00 UTC</span>
              </div>
            </div>
          </div>
        );
      case 'network':
        return (
          <div className="spec-content-box">
            <h4 className="spec-section-header">NETWORK BOUNDARY DESIGN</h4>
            <p className="spec-section-desc">
              Secure perimeter design isolating compute services from databases and the public internet.
            </p>
            <div className="spec-rows-list">
              <div className="spec-detail-row">
                <span className="spec-row-key">VPC CIDR block</span>
                <span className="spec-row-val font-mono">10.0.0.0/16</span>
              </div>
              <div className="spec-detail-row">
                <span className="spec-row-key">Public Subnets</span>
                <span className="spec-row-val font-mono">10.0.101.0/24 (AZ-a), 10.0.102.0/24 (AZ-b)</span>
              </div>
              <div className="spec-detail-row">
                <span className="spec-row-key">Private Subnets</span>
                <span className="spec-row-val font-mono">10.0.1.0/24 (AZ-a), 10.0.2.0/24 (AZ-b)</span>
              </div>
              <div className="spec-detail-row">
                <span className="spec-row-key">Ingress Routing</span>
                <span className="spec-row-val">Internet Gateway -> ALB (Port 80/443) -> Target Tasks</span>
              </div>
              <div className="spec-detail-row">
                <span className="spec-row-key">Egress Routing</span>
                <span className="spec-row-val">NAT Gateway (Single instance mapped inside public subnet)</span>
              </div>
            </div>
          </div>
        );
      case 'storage':
        return (
          <div className="spec-content-box">
            <h4 className="spec-section-header">STORAGE & CACHING PROFILE</h4>
            <p className="spec-section-desc">
              Stateless cluster mounts and high-speed memory caching layout.
            </p>
            <div className="spec-rows-list">
              <div className="spec-detail-row">
                <span className="spec-row-key">Object Storage</span>
                <span className="spec-row-val">Amazon S3 Standard Bucket (Static/uploaded assets)</span>
              </div>
              <div className="spec-detail-row">
                <span className="spec-row-key">Content Delivery Network</span>
                <span className="spec-row-val">Amazon CloudFront (Edge caching for static frontend files)</span>
              </div>
              <div className="spec-detail-row">
                <span className="spec-row-key">Persistent Mounts</span>
                <span className="spec-row-val font-mono">None (Container is stateless)</span>
              </div>
              <div className="spec-detail-row">
                <span className="spec-row-key">In-Memory Store</span>
                <span className="spec-row-val font-mono">Amazon ElastiCache Redis v7 (Serverless)</span>
              </div>
              <div className="spec-detail-row">
                <span className="spec-row-key">Cache Eviction Rule</span>
                <span className="spec-row-val font-mono">volatile-lru</span>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rec-details-wrapper">
      <div className="details-tabs-header">
        <button
          type="button"
          className={`details-tab-btn ${activeDetailTab === 'database' ? 'active' : ''}`}
          onClick={() => setActiveDetailTab('database')}
        >
          Database Recommendations
        </button>
        <button
          type="button"
          className={`details-tab-btn ${activeDetailTab === 'network' ? 'active' : ''}`}
          onClick={() => setActiveDetailTab('network')}
        >
          Network Design
        </button>
        <button
          type="button"
          className={`details-tab-btn ${activeDetailTab === 'storage' ? 'active' : ''}`}
          onClick={() => setActiveDetailTab('storage')}
        >
          Storage & Caching
        </button>
      </div>

      <div className="details-body">
        {renderDetailsContent()}
      </div>
    </div>
  );
}

export default RecommendationDetails;
