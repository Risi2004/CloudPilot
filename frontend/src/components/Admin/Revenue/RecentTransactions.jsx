import React, { useState } from 'react';
import './RecentTransactions.css';

const ALL_TRANSACTIONS = [
  { id: 'tx-1', name: 'Acme Systems', email: 'billing@acme.co', initials: 'AS', status: 'COMPLETED', plan: 'Enterprise (Annual)', amount: '$24,400.00', date: 'Oct 24, 2023' },
  { id: 'tx-2', name: 'Global Logistics', email: 'finance@gl-ship.com', initials: 'GL', status: 'COMPLETED', plan: 'Pro (Monthly)', amount: '$899.00', date: 'Oct 23, 2023' },
  { id: 'tx-3', name: 'Vortex Tech', email: 'admin@vortex.io', initials: 'VT', status: 'PENDING', plan: 'Enterprise (Annual)', amount: '$12,000.00', date: 'Oct 23, 2023' },
  { id: 'tx-4', name: 'Nexus Holding', email: 'billing@nexus.dev', initials: 'NH', status: 'FAILED', plan: 'Pro (Monthly)', amount: '$899.00', date: 'Oct 22, 2023' },
  // Extra pages of mock data for full interactive feel
  { id: 'tx-5', name: 'Alpha Biotech', email: 'billing@alpha.bio', initials: 'AB', status: 'COMPLETED', plan: 'Pro (Monthly)', amount: '$899.00', date: 'Oct 21, 2023' },
  { id: 'tx-6', name: 'Quantum Crypt', email: 'ops@quantum.io', initials: 'QC', status: 'COMPLETED', plan: 'Enterprise (Annual)', amount: '$24,400.00', date: 'Oct 20, 2023' },
  { id: 'tx-7', name: 'Stellar Tech', email: 'finance@stellar.dev', initials: 'ST', status: 'PENDING', plan: 'Pro (Monthly)', amount: '$899.00', date: 'Oct 19, 2023' },
  { id: 'tx-8', name: 'Zeta Software', email: 'billing@zeta.com', initials: 'ZS', status: 'FAILED', plan: 'Starter (Monthly)', amount: '$99.00', date: 'Oct 18, 2023' },
  { id: 'tx-9', name: 'Nova Express', email: 'billing@nova.io', initials: 'NE', status: 'COMPLETED', plan: 'Starter (Monthly)', amount: '$99.00', date: 'Oct 17, 2023' },
  { id: 'tx-10', name: 'SkyGrid Inc', email: 'ops@skygrid.co', initials: 'SI', status: 'COMPLETED', plan: 'Enterprise (Annual)', amount: '$24,400.00', date: 'Oct 16, 2023' },
  { id: 'tx-11', name: 'Volt Energy', email: 'billing@volt.energy', initials: 'VE', status: 'COMPLETED', plan: 'Pro (Monthly)', amount: '$899.00', date: 'Oct 15, 2023' },
  { id: 'tx-12', name: 'Pixel Media', email: 'billing@pixel.net', initials: 'PM', status: 'COMPLETED', plan: 'Starter (Monthly)', amount: '$99.00', date: 'Oct 14, 2023' }
];

function RecentTransactions() {
  const [filterPlan, setFilterPlan] = useState('All');
  const [currentPage, setCurrentPage] = useState(0);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);

  // Filtering
  const filteredTx = ALL_TRANSACTIONS.filter((tx) => {
    if (filterPlan === 'All') return true;
    if (filterPlan === 'Enterprise') return tx.plan.includes('Enterprise');
    if (filterPlan === 'Pro') return tx.plan.includes('Pro');
    if (filterPlan === 'Starter') return tx.plan.includes('Starter');
    return true;
  });

  // Pagination
  const pageSize = 4;
  const pageCount = Math.ceil(filteredTx.length / pageSize);
  const displayedTx = filteredTx.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const handlePrevPage = () => {
    if (currentPage > 0) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < pageCount - 1) setCurrentPage(currentPage + 1);
  };

  const handlePlanChange = (e) => {
    setFilterPlan(e.target.value);
    setCurrentPage(0); // Reset page on filter change
  };

  const toggleActionMenu = (id) => {
    if (actionMenuOpen === id) {
      setActionMenuOpen(null);
    } else {
      setActionMenuOpen(id);
    }
  };

  return (
    <div className="recent-transactions-card">
      <div className="transactions-header-row">
        <h3 className="transactions-card-title">Recent Transactions</h3>
        
        <div className="transactions-filter-wrapper">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="filter-icon">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          </svg>
          <select 
            className="plans-select-filter"
            value={filterPlan}
            onChange={handlePlanChange}
          >
            <option value="All">All Plans</option>
            <option value="Enterprise">Enterprise Only</option>
            <option value="Pro">Pro Only</option>
            <option value="Starter">Starter Only</option>
          </select>
        </div>
      </div>

      <div className="table-responsive-container">
        <table className="transactions-table">
          <thead>
            <tr>
              <th>CUSTOMER</th>
              <th>STATUS</th>
              <th>PLAN</th>
              <th>AMOUNT</th>
              <th>DATE</th>
              <th className="actions-header-cell">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {displayedTx.length > 0 ? (
              displayedTx.map((tx) => (
                <tr key={tx.id}>
                  <td>
                    <div className="tx-user-cell">
                      <span className="tx-initials-bubble">{tx.initials}</span>
                      <div className="tx-user-info-text">
                        <span className="tx-user-name">{tx.name}</span>
                        <span className="tx-user-email">{tx.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`status-pill ${tx.status.toLowerCase()}`}>
                      <span className="status-dot" />
                      {tx.status}
                    </span>
                  </td>
                  <td>
                    <span className="tx-plan-text">{tx.plan}</span>
                  </td>
                  <td>
                    <span className="tx-amount-text">{tx.amount}</span>
                  </td>
                  <td>
                    <span className="tx-date-text">{tx.date}</span>
                  </td>
                  <td className="actions-body-cell">
                    <div className="action-trigger-container">
                      <button 
                        className="tx-dots-btn"
                        onClick={() => toggleActionMenu(tx.id)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="1"></circle>
                          <circle cx="12" cy="5" r="1"></circle>
                          <circle cx="12" cy="19" r="1"></circle>
                        </svg>
                      </button>

                      {actionMenuOpen === tx.id && (
                        <div className="tx-dropdown-menu">
                          <button onClick={() => { alert(`Refunding tx ${tx.id}...`); setActionMenuOpen(null); }}>Refund Transaction</button>
                          <button onClick={() => { alert(`Sending invoice to ${tx.email}...`); setActionMenuOpen(null); }}>Resend Invoice</button>
                          <button onClick={() => { alert(`Viewing receipt for tx ${tx.id}...`); setActionMenuOpen(null); }}>View Receipt</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="empty-table-cell">No transactions found for this filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="transactions-footer">
        <span className="footer-tx-count">
          Showing {displayedTx.length} of {filteredTx.length} transactions
        </span>
        
        <div className="footer-pagination-buttons">
          <button 
            className="pagination-btn" 
            onClick={handlePrevPage}
            disabled={currentPage === 0}
          >
            Previous
          </button>
          <button 
            className="pagination-btn" 
            onClick={handleNextPage}
            disabled={currentPage >= pageCount - 1 || pageCount === 0}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default RecentTransactions;
