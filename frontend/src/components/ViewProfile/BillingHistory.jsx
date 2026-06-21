import React from 'react';
import './ProfileCard.css';
import './BillingHistory.css';

const BILLING_RECORDS = [
  { id: 1, timestamp: '2026-06-01 14:32', service: 'Pro Plan', value: '$19.00', status: 'PAID' },
  { id: 2, timestamp: '2026-05-01 09:15', service: 'Pro Plan', value: '$19.00', status: 'PAID' },
  { id: 3, timestamp: '2026-04-01 11:48', service: 'Pro Plan', value: '$19.00', status: 'PAID' },
  { id: 4, timestamp: '2026-03-01 16:22', service: 'Pro Plan', value: '$19.00', status: 'PAID' },
];

function BillingHistory() {
  return (
    <section className="vp-card billing-history-card">
      <div className="vp-card-header">
        <h3 className="vp-card-title">
          <svg className="vp-card-title-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2">
            <rect x="1" y="4" width="22" height="16" rx="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
          Billing History
        </h3>
      </div>

      <div className="billing-table">
        <div className="billing-table-head">
          <span className="billing-col timestamp-col">TIMESTAMP</span>
          <span className="billing-col service-col">SERVICE</span>
          <span className="billing-col value-col">VALUE</span>
          <span className="billing-col status-col">STATUS</span>
        </div>

        {BILLING_RECORDS.map((record) => (
          <div key={record.id} className="billing-table-row">
            <span className="billing-col timestamp-col">{record.timestamp}</span>
            <span className="billing-col service-col">{record.service}</span>
            <span className="billing-col value-col">{record.value}</span>
            <span className="billing-col status-col">
              <span className="billing-status-badge paid">{record.status}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default BillingHistory;
