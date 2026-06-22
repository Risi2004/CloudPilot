import React, { useState, useEffect } from 'react';
import './Support.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Layout and widgets
import AdminSidebar from '../../../components/Admin/AdminDashboard/AdminSidebar';
import SupportMetrics from '../../../components/Admin/Support/SupportMetrics';
import TicketsList from '../../../components/Admin/Support/TicketsList';
import TicketChat from '../../../components/Admin/Support/TicketChat';
import CopilotSuggestion from '../../../components/Admin/Support/CopilotSuggestion';

const INITIAL_TICKETS = [
  {
    id: '#CP-8921',
    subject: 'API Endpoint 403 Errors',
    desc: 'Production cluster unstable...',
    initials: 'JD',
    userName: 'John Doe',
    priority: 'Urgent',
    admin: 'Sarah K.',
    status: 'open'
  },
  {
    id: '#CP-8922',
    subject: 'Billing Discrepancy June',
    desc: 'Invoice showing extra instance usage...',
    initials: 'AL',
    userName: 'Alice Liao',
    priority: 'High',
    admin: 'Unassigned',
    status: 'open'
  },
  {
    id: '#CP-8919',
    subject: 'New Agent Token Request',
    desc: 'Requesting access to beta LLM nodes...',
    initials: 'MK',
    userName: 'Mike K.',
    priority: 'Med',
    admin: 'Sarah K.',
    status: 'in-progress'
  },
  {
    id: '#CP-8918',
    subject: 'UI Lag in Safari 17',
    desc: 'Dashboard charts flicker on resize...',
    initials: 'RT',
    userName: 'Ray T.',
    priority: 'Low',
    admin: 'David M.',
    status: 'resolved'
  },
  {
    id: '#CP-8915',
    subject: 'OTP Dispatch Delivery Delay',
    desc: 'Users waiting over 5 mins for auth SMS code...',
    initials: 'SK',
    userName: 'Sanjay K.',
    priority: 'Urgent',
    admin: 'David M.',
    status: 'open'
  },
  {
    id: '#CP-8912',
    subject: 'VPC Route Peering Failure',
    desc: 'Autopilot failing to establish gateway link...',
    initials: 'ET',
    userName: 'Elena T.',
    priority: 'High',
    admin: 'Unassigned',
    status: 'in-progress'
  },
  {
    id: '#CP-8910',
    subject: 'GPU Compute Scaling Limits',
    desc: 'Requested upgrade to A100 dedicated block...',
    initials: 'MX',
    userName: 'Marcus X.',
    priority: 'Med',
    admin: 'Sarah K.',
    status: 'resolved'
  },
  {
    id: '#CP-8908',
    subject: 'Account Password Reset Lock',
    desc: 'Lockout after 3 failed login attempts...',
    initials: 'JN',
    userName: 'Julia N.',
    priority: 'Low',
    admin: 'David M.',
    status: 'closed'
  }
];

const PRIORITY_ORDER = {
  'urgent': 4,
  'high': 3,
  'med': 2,
  'low': 1
};

function Support() {
  const [tickets, setTickets] = useState([]);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);

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
          if (selectFirst || !activeTicketId || !data.some(t => t.id === activeTicketId)) {
            setActiveTicketId(data[0].id);
          }
        } else {
          setActiveTicketId(null);
        }
      }
    } catch (err) {
      console.error('Error fetching admin tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Poll for tickets/messages update every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTickets();
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTicketId]);

  const activeTicket = tickets.find((t) => t.id === activeTicketId);

  const handleResolveTicket = async (ticketId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/tickets/${encodeURIComponent(ticketId)}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'resolved' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to resolve ticket.');
      await fetchTickets();
      alert(`Ticket ${ticketId} resolved successfully.`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCloseTicket = async (ticketId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/tickets/${encodeURIComponent(ticketId)}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'closed' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to close ticket.');
      await fetchTickets();
      alert(`Ticket ${ticketId} closed successfully.`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSendMessage = async (text) => {
    if (!activeTicketId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/tickets/${encodeURIComponent(activeTicketId)}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send message.');
      await fetchTickets();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleApplyFix = async (ticketId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/tickets/${encodeURIComponent(ticketId)}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'resolved' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to apply fix.');
      await fetchTickets();
      alert(`AI Copilot recommendation applied. Ticket ${ticketId} resolved.`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleActionLog = (msg) => {
    console.log('Action log:', msg);
  };

  const handleCreateTicket = async () => {
    const subject = prompt('Enter ticket subject:');
    if (!subject) return;
    const desc = prompt('Enter ticket description:');
    if (!desc) return;
    const priorityVal = prompt('Enter ticket priority (Urgent, High, Med, Low):', 'Med');
    if (!priorityVal) return;

    const formattedPriority =
      priorityVal.charAt(0).toUpperCase() + priorityVal.slice(1).toLowerCase();

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          subject,
          desc,
          priority: formattedPriority
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create ticket.');
      
      await fetchTickets();
      if (data.ticket) {
        setActiveTicketId(data.ticket.id);
      }
      alert(`Ticket created successfully.`);
    } catch (err) {
      alert(err.message);
    }
  };

  // Sort logic
  const sortedTickets = [...tickets].sort((a, b) => {
    if (sortBy === 'priority') {
      const priorityA = PRIORITY_ORDER[a.priority.toLowerCase()] || 0;
      const priorityB = PRIORITY_ORDER[b.priority.toLowerCase()] || 0;
      return priorityB - priorityA; // Higher priority first
    } else if (sortBy === 'id') {
      return a.id.localeCompare(b.id);
    } else {
      // 'newest'
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  return (
    <div className="admin-dashboard-container">
      {/* Left Sidebar */}
      <AdminSidebar activeTab="support" />

      {/* Right Content Area */}
      <main className="admin-dashboard-main">
        <div className="admin-subview">
          {/* Header Row */}
          <div className="support-header-row">
            <div className="header-left">
              <h1 className="support-page-title">Support & Tickets</h1>
              <p className="support-page-subtitle">
                Resolve user issues, review system alerts, and apply automated hotfixes.
              </p>
            </div>

            <div className="header-right">
              {/* Sort Selector */}
              <div className="sort-selector-wrapper">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sort-icon">
                  <line x1="21" y1="10" x2="3" y2="10"></line>
                  <line x1="21" y1="6" x2="3" y2="6"></line>
                  <line x1="21" y1="14" x2="3" y2="14"></line>
                  <line x1="21" y1="18" x2="3" y2="18"></line>
                </svg>
                <select
                  className="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newest">Sort: Newest</option>
                  <option value="priority">Sort: Priority</option>
                  <option value="id">Sort: Ticket ID</option>
                </select>
              </div>

              {/* Create Ticket Trigger */}
              <button className="create-ticket-btn" onClick={handleCreateTicket}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="btn-icon">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Create Ticket
              </button>
            </div>
          </div>

          {/* Stats Metrics Cards */}
          <SupportMetrics />

          {/* Core Support Console Split Grid */}
          <div className="support-layout-split">
            {/* Left Column: Tickets log Table list */}
            <div className="support-list-column">
              {loading ? (
                <div style={{ color: '#94a3b8', padding: '20px', textAlign: 'center' }}>Loading tickets...</div>
              ) : (
                <TicketsList
                  activeTicketId={activeTicketId}
                  onSelectTicket={setActiveTicketId}
                  ticketsListOverride={sortedTickets}
                />
              )}
            </div>

            {/* Right Column: AI Suggestion and Chat dialogues */}
            <div className="support-chat-column">
              <CopilotSuggestion
                activeTicketId={activeTicketId}
                onApplyFix={handleApplyFix}
              />
              <TicketChat
                activeTicket={activeTicket}
                onSendMessage={handleSendMessage}
                onResolveTicket={handleResolveTicket}
                onCloseTicket={handleCloseTicket}
                onActionLog={handleActionLog}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Support;
