import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './TopSubscribers.css';

const SUBSCRIBERS = [
  {
    id: 'sub-1',
    name: 'NeuralVortex Inc.',
    meta: 'ID: CP-9001-A',
    plan: 'ENTERPRISE',
    healthScore: 98,
    revenue: '$1,250.00',
    avatarText: 'NV',
    avatarBg: 'rgba(255, 255, 255, 0.03)',
    avatarColor: '#94a3b8'
  },
  {
    id: 'sub-2',
    name: 'QuantTerra Labs',
    meta: 'ID: CP-8821-B',
    plan: 'PRO',
    healthScore: 92,
    revenue: '$49.00',
    avatarText: 'QT',
    avatarBg: 'rgba(16, 185, 129, 0.08)',
    avatarColor: '#10b981'
  },
  {
    id: 'sub-3',
    name: 'Synthetix Solutions',
    meta: 'ID: CP-7654-Z',
    plan: 'ENTERPRISE',
    healthScore: 64,
    revenue: '$840.50',
    avatarText: 'S2',
    avatarBg: 'rgba(255, 255, 255, 0.03)',
    avatarColor: '#94a3b8'
  }
];

function TopSubscribers() {
  const navigate = useNavigate();
  const [activeDropdown, setActiveDropdown] = useState(null);

  const handleActionClick = (id, e) => {
    e.stopPropagation();
    setActiveDropdown(activeDropdown === id ? null : id);
  };

  // Close dropdown on window click
  React.useEffect(() => {
    const closeAll = () => setActiveDropdown(null);
    window.addEventListener('click', closeAll);
    return () => window.removeEventListener('click', closeAll);
  }, []);

  return (
    <div className="top-subs-card">
      <div className="top-subs-header">
        <h3 className="subs-title">Top-Tier Subscribers</h3>
        <button 
          className="view-all-users-btn" 
          onClick={() => navigate('/admin/users')}
        >
          View All Users
        </button>
      </div>

      <div className="subs-table-wrapper">
        <table className="subs-table">
          <thead>
            <tr>
              <th>SUBSCRIBER</th>
              <th>PLAN</th>
              <th>HEALTH SCORE</th>
              <th>REVENUE</th>
              <th className="text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {SUBSCRIBERS.map((sub) => {
              const isWarning = sub.healthScore < 80;
              return (
                <tr key={sub.id} className="sub-row">
                  
                  {/* Subscriber Info */}
                  <td className="col-sub">
                    <div className="sub-cell">
                      <span 
                        className="sub-avatar"
                        style={{ backgroundColor: sub.avatarBg, color: sub.avatarColor }}
                      >
                        {sub.avatarText}
                      </span>
                      <div className="sub-info">
                        <span className="sub-name">{sub.name}</span>
                        <span className="sub-meta">{sub.meta}</span>
                      </div>
                    </div>
                  </td>

                  {/* Plan Badge */}
                  <td className="col-plan">
                    <span className={`sub-plan-badge ${sub.plan.toLowerCase()}`}>
                      {sub.plan}
                    </span>
                  </td>

                  {/* Health Score */}
                  <td className="col-health">
                    <span className={`health-score-indicator ${isWarning ? 'warning' : 'normal'}`}>
                      {isWarning ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="health-icon">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                          <line x1="12" y1="9" x2="12" y2="13"></line>
                          <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="health-icon">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                      {sub.healthScore}/100
                    </span>
                  </td>

                  {/* Revenue */}
                  <td className="col-revenue">
                    <span className="revenue-val">{sub.revenue}</span>
                  </td>

                  {/* Actions Dropdown */}
                  <td className="col-actions text-right">
                    <div className="sub-action-menu-container">
                      <button 
                        className="sub-dots-btn" 
                        onClick={(e) => handleActionClick(sub.id, e)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="1"></circle>
                          <circle cx="12" cy="5" r="1"></circle>
                          <circle cx="12" cy="19" r="1"></circle>
                        </svg>
                      </button>
                      {activeDropdown === sub.id && (
                        <div className="sub-action-dropdown">
                          <button onClick={() => alert(`Review invoice cycles for ${sub.name}`)}>
                            Invoicing Details
                          </button>
                          <button onClick={() => alert(`Review latency metrics for ${sub.name}`)}>
                            Cluster Latency
                          </button>
                        </div>
                      )}
                    </div>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TopSubscribers;
