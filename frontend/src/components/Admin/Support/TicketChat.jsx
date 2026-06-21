import React, { useState, useEffect, useRef } from 'react';
import './TicketChat.css';

const DEFAULT_THREADS = {
  '#CP-8921': [
    { sender: 'user', time: '13:02 PM', label: 'User', msg: 'Hey, we are seeing sudden 403 authorization failures on all endpoints of cluster-v2. Is the control plane down?' },
    { sender: 'system', time: '13:05 PM', label: 'System', msg: 'Checking cluster gateway logs... Control plane is healthy, but auth keys secret appears to have expired.' }
  ],
  '#CP-8922': [
    { sender: 'user', time: '10:42 AM', label: 'User', msg: 'Hello, I noticed my bill for June is $120 higher than usual. Can you explain why?' },
    { sender: 'system', time: '10:45 AM', label: 'System', msg: 'We are looking into your usage logs for the "US-West-1" region. One moment please.' },
    { sender: 'user', time: '11:15 AM', label: 'User', msg: 'Any updates? I have an audit tomorrow and need this cleared up.' }
  ],
  '#CP-8919': [
    { sender: 'user', time: '08:12 AM', label: 'User', msg: 'Need a new API token to register Skynet worker nodes. Please approve.' },
    { sender: 'admin', time: '08:24 AM', label: 'Sarah K. • Admin', msg: 'Reviewing request credentials. Security clearance verified.' }
  ],
  '#CP-8918': [
    { sender: 'user', time: '15:40 PM', label: 'User', msg: 'The dashboards are flickering in Safari on macOS Sonoma. Resizing breaks layouts.' },
    { sender: 'system', time: '15:42 PM', label: 'System', msg: 'Safari CSS hardware acceleration conflict detected. Pushing fix pipeline.' }
  ]
};

const ASSIGNEES = {
  '#CP-8921': 'Sarah K.',
  '#CP-8922': 'Unassigned',
  '#CP-8919': 'Sarah K.',
  '#CP-8918': 'David M.'
};

function TicketChat({ activeTicketId, onResolveTicket, onActionLog }) {
  const [threads, setThreads] = useState(DEFAULT_THREADS);
  const [assignees, setAssignees] = useState(ASSIGNEES);
  const [replyText, setReplyText] = useState('');
  const chatEndRef = useRef(null);

  const activeMessages = threads[activeTicketId] || [
    { sender: 'system', time: 'Just Now', label: 'System', msg: 'Empty ticket conversation thread.' }
  ];

  const assignee = assignees[activeTicketId] || 'Unassigned';

  // Scroll to bottom on new message
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [threads, activeTicketId]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    const text = replyText.trim();
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    // Append admin reply
    const newReply = {
      sender: 'admin',
      time: `${timeStr} PM`,
      label: 'Admin User',
      msg: text
    };

    setThreads((prev) => ({
      ...prev,
      [activeTicketId]: [...(prev[activeTicketId] || []), newReply]
    }));

    setReplyText('');

    // If ticket was unassigned, automatically assign it to Admin User!
    if (assignee === 'Unassigned') {
      setAssignees((prev) => ({
        ...prev,
        [activeTicketId]: 'Admin User'
      }));
      if (onActionLog) {
        onActionLog(`Ticket ${activeTicketId} has been assigned to Admin User.`);
      }
    }

    // Simulate system response if it was an open question
    setTimeout(() => {
      const systemReply = {
        sender: 'system',
        time: `${timeStr} PM`,
        label: 'System',
        msg: 'Acknowledge. Your response has been dispatched to the operator queue.'
      };
      setThreads((prev) => ({
        ...prev,
        [activeTicketId]: [...(prev[activeTicketId] || []), systemReply]
      }));
    }, 1500);
  };

  const handleResolve = () => {
    if (onResolveTicket) {
      onResolveTicket(activeTicketId);
    } else {
      alert(`Ticket ${activeTicketId} resolved.`);
    }
  };

  const handleClose = () => {
    alert(`Ticket ${activeTicketId} closed.`);
  };

  return (
    <div className="ticket-chat-card">
      {/* Header */}
      <div className="chat-header-row">
        <div className="header-left-info">
          <span className="chat-ticket-id">Ticket {activeTicketId}</span>
          <span className={`chat-ticket-assignee ${assignee === 'Unassigned' ? 'unassigned' : ''}`}>
            Assigned to: {assignee}
          </span>
        </div>
        
        <div className="header-right-actions">
          {/* Resolve Ticket (Green Circle) */}
          <button 
            className="action-circle-btn resolve" 
            title="Mark Resolved"
            onClick={handleResolve}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
          
          {/* Close Ticket (Red Circle) */}
          <button 
            className="action-circle-btn close-btn" 
            title="Mark Closed"
            onClick={handleClose}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="chat-message-display">
        {activeMessages.map((msg, i) => (
          <div key={i} className={`chat-message-bubble-row ${msg.sender}`}>
            <div className="message-bubble">
              <span className="bubble-msg">{msg.msg}</span>
            </div>
            <span className="bubble-meta">
              {msg.label} • {msg.time}
            </span>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input panel */}
      <form onSubmit={handleSend} className="chat-input-form">
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Type your response..."
          className="chat-textarea-input"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
        />

        <div className="chat-input-footer">
          <div className="chat-footer-left">
            <button type="button" className="attachment-btn" title="Add Attachment" onClick={() => alert('Attachments limit: 20MB.')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
              </svg>
            </button>
            <button type="button" className="attachment-btn" title="Insert Emoji" onClick={() => alert('Emojis database loaded.')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                <line x1="9" y1="9" x2="9.01" y2="9"></line>
                <line x1="15" y1="9" x2="15.01" y2="9"></line>
              </svg>
            </button>
          </div>
          
          <button type="submit" className="chat-send-btn">
            Send Reply
          </button>
        </div>
      </form>
    </div>
  );
}

export default TicketChat;
