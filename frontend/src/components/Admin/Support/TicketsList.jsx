import React, { useState } from 'react';
import './TicketsList.css';

function TicketsList({ activeTicketId, onSelectTicket, ticketsListOverride }) {
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Sync tickets with overrides from parent state (e.g. status changes resolved via copilot)
  const tickets = ticketsListOverride || [];

  // Filter count
  const openCount = tickets.filter(t => t.status === 'open').length;
  const progressCount = tickets.filter(t => t.status === 'in-progress').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length;
  const closedCount = tickets.filter(t => t.status === 'closed').length;

  // Filtering
  const filteredTickets = tickets.filter((t) => {
    if (selectedStatus === 'all') return true;
    return t.status === selectedStatus;
  });

  // Simple Pagination
  const pageSize = 4;
  const totalPages = Math.ceil(filteredTickets.length / pageSize) || 1;
  const displayedTickets = filteredTickets.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getPriorityClass = (priority) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'badge-urgent';
      case 'high': return 'badge-high';
      case 'med': return 'badge-med';
      case 'low': return 'badge-low';
      default: return '';
    }
  };

  const handleTabChange = (status) => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };

  return (
    <div className="tickets-list-panel">
      {/* Filters and Submetrics Row */}
      <div className="tickets-filter-row">
        <div className="filter-left-tabs">
          <button 
            className={`filter-tab-pill ${selectedStatus === 'all' ? 'active' : ''}`}
            onClick={() => handleTabChange('all')}
          >
            All Tickets <span className="tab-count">{tickets.length}</span>
          </button>
          
          <button 
            className={`filter-tab-pill ${selectedStatus === 'open' ? 'active' : ''}`}
            onClick={() => handleTabChange('open')}
          >
            <span className="dot-indicator open" />
            Open <span className="tab-count">{openCount}</span>
          </button>

          <button 
            className={`filter-tab-pill ${selectedStatus === 'in-progress' ? 'active' : ''}`}
            onClick={() => handleTabChange('in-progress')}
          >
            <span className="dot-indicator in-progress" />
            In Progress <span className="tab-count">{progressCount}</span>
          </button>

          <button 
            className={`filter-tab-pill ${selectedStatus === 'resolved' ? 'active' : ''}`}
            onClick={() => handleTabChange('resolved')}
          >
            <span className="dot-indicator resolved" />
            Resolved <span className="tab-count">{resolvedCount}</span>
          </button>

          <button 
            className={`filter-tab-pill ${selectedStatus === 'closed' ? 'active' : ''}`}
            onClick={() => handleTabChange('closed')}
          >
            <span className="dot-indicator closed" />
            Closed <span className="tab-count">{closedCount}</span>
          </button>
        </div>

        {/* Small repeated metric overview */}
        <div className="mini-metrics-box">
          <div className="mini-metric">
            <span className="mini-lbl">AVG. RESPONSE</span>
            <span className="mini-val">48 Hours</span>
          </div>
          <div className="mini-divider" />
          <div className="mini-metric">
            <span className="mini-lbl">SLA HEALTH</span>
            <span className="mini-val green">98.2%</span>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="tickets-table-container">
        <table className="tickets-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>SUBJECT</th>
              <th>USER</th>
              <th>PRIORITY</th>
              <th>ADMIN</th>
              <th className="action-header">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {displayedTickets.map((t) => {
              const isActive = activeTicketId === t.id;
              return (
                <tr 
                  key={t.id} 
                  className={`ticket-row-item ${isActive ? 'selected' : ''}`}
                  onClick={() => onSelectTicket(t.id)}
                >
                  <td className="ticket-id-cell">{t.id}</td>
                  <td>
                    <div className="ticket-subject-cell">
                      <span className="subject-title">{t.subject}</span>
                      <span className="subject-desc-snippet">{t.desc}</span>
                    </div>
                  </td>
                  <td>
                    <div className="ticket-user-bubble-cell">
                      <span className="user-initials-bubble">
                        {t.initials || (t.userName ? t.userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : '??')}
                      </span>
                      <span className="user-name-text">{t.userName}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`priority-badge ${getPriorityClass(t.priority)}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-assignee ${t.admin === 'Unassigned' ? 'unassigned' : ''}`}>
                      {t.admin}
                    </span>
                  </td>
                  <td className="action-body-cell" onClick={(e) => e.stopPropagation()}>
                    {isActive ? (
                      <span className="chat-selected-indicator" title="Active Thread">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="chat-bubble-svg">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                      </span>
                    ) : (
                      <button 
                        className="ticket-dots-btn"
                        onClick={() => alert(`Settings drawer for ticket ${t.id} coming soon!`)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="1"></circle>
                          <circle cx="12" cy="5" r="1"></circle>
                          <circle cx="12" cy="19" r="1"></circle>
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="tickets-footer-row">
        <span className="footer-doc-count">
          Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredTickets.length)} of {filteredTickets.length} tickets
        </span>
        
        <div className="pagination-arrows-row">
          <button 
            className="arrow-pag-btn" 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            &lt;
          </button>
          
          {[...Array(totalPages)].map((_, i) => (
            <button 
              key={i} 
              className={`page-num-btn ${currentPage === i + 1 ? 'active' : ''}`}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}

          <button 
            className="arrow-pag-btn" 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage >= totalPages}
          >
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
}

export default TicketsList;
