import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import './SupportUser.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function SupportUser() {
  const [tickets, setTickets] = useState([]);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [sortBy, setSortBy] = useState('all');
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Modal State for new ticket
  const [modalOpen, setModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('Med');
  const [submittingTicket, setSubmittingTicket] = useState(false);

  const chatEndRef = useRef(null);

  // Fetch all tickets on mount
  const fetchTickets = async (selectFirst = false) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
        if (data.length > 0) {
          if (selectFirst || !activeTicketId) {
            setActiveTicketId(data[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Poll for new messages every 5 seconds for the active ticket
  useEffect(() => {
    if (!activeTicketId) return;
    const interval = setInterval(() => {
      fetchTickets();
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTicketId]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [tickets, activeTicketId]);

  const activeTicket = tickets.find((t) => t.id === activeTicketId);

  // Filter count
  const openCount = tickets.filter(t => t.status === 'open' || t.status === 'in-progress').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDesc.trim()) {
      alert('Subject and Description are required.');
      return;
    }

    try {
      setSubmittingTicket(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: newSubject,
          desc: newDesc,
          priority: newPriority
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to raise ticket.');

      setNewSubject('');
      setNewDesc('');
      setNewPriority('Med');
      setModalOpen(false);
      
      // Refresh tickets list and select the newly created one
      await fetchTickets(true);
      alert('Your ticket has been raised successfully.');
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicketId) return;

    try {
      setSendingMsg(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/tickets/${encodeURIComponent(activeTicketId)}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: replyText })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send message.');

      setReplyText('');
      await fetchTickets();
    } catch (err) {
      alert(err.message);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!activeTicketId) return;
    if (!window.confirm('Are you sure you want to resolve and close this ticket?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/tickets/${encodeURIComponent(activeTicketId)}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'resolved' })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update status.');

      await fetchTickets();
      alert('Ticket marked as resolved.');
    } catch (err) {
      alert(err.message);
    }
  };

  // Filtered tickets list based on selected tab
  const filteredTickets = tickets.filter((t) => {
    if (sortBy === 'open') return t.status === 'open' || t.status === 'in-progress';
    if (sortBy === 'resolved') return t.status === 'resolved' || t.status === 'closed';
    return true;
  });

  const getPriorityClass = (priority) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'badge-urgent';
      case 'high': return 'badge-high';
      case 'med': return 'badge-med';
      case 'low': return 'badge-low';
      default: return '';
    }
  };

  return (
    <DashboardLayout>
      <div className="support-user-container">
        {/* Support Header */}
        <div className="support-user-header">
          <div>
            <h1 className="support-user-title">Mission Support Fleet</h1>
            <p className="support-user-subtitle">
              Raise tickets, review telemetry feedback, and communicate directly with autopilot engineers.
            </p>
          </div>
          <button className="raise-ticket-btn" onClick={() => setModalOpen(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="btn-icon">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Raise Support Ticket
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="support-user-metrics">
          <div className="support-metric-card">
            <span className="metric-lbl">ACTIVE TICKETS</span>
            <span className="metric-val">{openCount}</span>
          </div>
          <div className="support-metric-card">
            <span className="metric-lbl">RESOLVED TICKETS</span>
            <span className="metric-val green">{resolvedCount}</span>
          </div>
          <div className="support-metric-card">
            <span className="metric-lbl">AVG RESPONSE TIME</span>
            <span className="metric-val">24 Hours</span>
          </div>
          <div className="support-metric-card">
            <span className="metric-lbl">SLA COMPLIANCE</span>
            <span className="metric-val green">98.2%</span>
          </div>
        </div>

        {/* Content Workspace */}
        <div className="support-workspace-split">
          
          {/* Left Column: User Tickets list */}
          <div className="support-left-column">
            <div className="filter-pill-container">
              <button 
                className={`filter-pill ${sortBy === 'all' ? 'active' : ''}`}
                onClick={() => setSortBy('all')}
              >
                All ({tickets.length})
              </button>
              <button 
                className={`filter-pill ${sortBy === 'open' ? 'active' : ''}`}
                onClick={() => setSortBy('open')}
              >
                Open ({openCount})
              </button>
              <button 
                className={`filter-pill ${sortBy === 'resolved' ? 'active' : ''}`}
                onClick={() => setSortBy('resolved')}
              >
                Resolved ({resolvedCount})
              </button>
            </div>

            <div className="user-tickets-scrollable">
              {loading ? (
                <div className="loading-placeholder">Fetching tickets...</div>
              ) : filteredTickets.length === 0 ? (
                <div className="empty-placeholder">No tickets found.</div>
              ) : (
                filteredTickets.map((t) => {
                  const isActive = activeTicketId === t.id;
                  return (
                    <div 
                      key={t.id} 
                      className={`user-ticket-card-item ${isActive ? 'selected' : ''}`}
                      onClick={() => setActiveTicketId(t.id)}
                    >
                      <div className="ticket-card-top">
                        <span className="ticket-card-id">{t.id}</span>
                        <span className={`ticket-card-status ${t.status}`}>
                          {t.status.toUpperCase()}
                        </span>
                      </div>
                      <h4 className="ticket-card-subject">{t.subject}</h4>
                      <p className="ticket-card-desc">{t.desc.substring(0, 75)}{t.desc.length > 75 ? '...' : ''}</p>
                      <div className="ticket-card-meta">
                        <span className={`priority-badge ${getPriorityClass(t.priority)}`}>
                          {t.priority}
                        </span>
                        <span className="ticket-card-assignee">
                          Assignee: {t.admin}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Chat Dialog Box */}
          <div className="support-right-column">
            {activeTicket ? (
              <div className="user-ticket-chat-box">
                {/* Chat Header */}
                <div className="chat-box-header">
                  <div>
                    <h3 className="chat-box-subject">{activeTicket.subject}</h3>
                    <div className="chat-box-meta">
                      <span>Ticket {activeTicket.id}</span>
                      <span className="meta-divider">•</span>
                      <span>Assigned to: {activeTicket.admin}</span>
                    </div>
                  </div>
                  {activeTicket.status !== 'resolved' && activeTicket.status !== 'closed' && (
                    <button className="resolve-ticket-action-btn" onClick={handleCloseTicket}>
                      Mark Resolved
                    </button>
                  )}
                </div>

                {/* Chat Body */}
                <div className="chat-box-message-display">
                  <div className="chat-message-bubble-row system">
                    <div className="message-bubble">
                      <span className="bubble-msg">{activeTicket.desc}</span>
                    </div>
                    <span className="bubble-meta">
                      {activeTicket.userName} (Creator) • Original Ticket Issue
                    </span>
                  </div>

                  {activeTicket.messages.map((msg, i) => (
                    <div key={i} className={`chat-message-bubble-row ${msg.sender}`}>
                      <div className="message-bubble">
                        <span className="bubble-msg">{msg.text}</span>
                      </div>
                      <span className="bubble-meta">
                        {msg.senderName} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                {activeTicket.status === 'closed' || activeTicket.status === 'resolved' ? (
                  <div className="chat-closed-footer">
                    This ticket has been marked as resolved/closed. You cannot send further replies.
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="chat-box-input-form">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your response to the support team..."
                      className="chat-box-textarea"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                    />
                    <div className="chat-box-input-footer">
                      <span className="attachment-help-text">Press Enter to dispatch response</span>
                      <button type="submit" className="chat-box-send-btn" disabled={sendingMsg}>
                        {sendingMsg ? 'Sending...' : 'Send Reply'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="chat-box-empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <h3>No Ticket Selected</h3>
                <p>Select a ticket from the sidebar logs or raise a new ticket to open the real-time timeline.</p>
              </div>
            )}
          </div>
        </div>

        {/* Raise Ticket Modal */}
        {modalOpen && (
          <div className="support-modal-overlay">
            <div className="support-modal-card">
              <div className="modal-header">
                <h3 className="modal-title">RAISE SECURE MISSION SUPPORT TICKET</h3>
                <button className="modal-close-btn" onClick={() => setModalOpen(false)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="modal-form">
                <div className="form-group">
                  <label className="form-label">SUBJECT / COMPONENT IDENTIFIER</label>
                  <input
                    type="text"
                    placeholder="e.g. AWS VPC Route Connection Failure"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">DETAILED INCIDENT DESCRIPTION</label>
                  <textarea
                    placeholder="Provide details on the logs, repo links, and error codes encountered..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="form-textarea"
                    rows={5}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">SEVERITY / PRIORITY STATUS</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="form-select"
                  >
                    <option value="Low">Low - Cosmetic/Suggestion</option>
                    <option value="Med">Medium - Normal Incident</option>
                    <option value="High">High - Impairing Telemetry Scans</option>
                    <option value="Urgent">Urgent - Autopilot Failure/Lockout</option>
                  </select>
                </div>

                <div className="modal-footer">
                  <button type="button" className="modal-btn secondary" onClick={() => setModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="modal-btn primary" disabled={submittingTicket}>
                    {submittingTicket ? 'RAISING TICKET...' : 'DISPATCH TICKET'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default SupportUser;
