import React, { useState, useEffect, useRef } from 'react';
import './TicketChat.css';

function TicketChat({ activeTicket, onSendMessage, onResolveTicket, onCloseTicket }) {
  const [replyText, setReplyText] = useState('');
  const chatEndRef = useRef(null);

  const activeMessages = activeTicket ? activeTicket.messages : [];
  const assignee = activeTicket ? activeTicket.admin : 'Unassigned';
  const activeTicketId = activeTicket ? activeTicket.id : null;

  // Scroll to bottom on new message
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicketId) return;

    if (onSendMessage) {
      onSendMessage(replyText.trim());
    }
    setReplyText('');
  };

  const handleResolve = () => {
    if (onResolveTicket && activeTicketId) {
      onResolveTicket(activeTicketId);
    }
  };

  const handleClose = () => {
    if (onCloseTicket && activeTicketId) {
      onCloseTicket(activeTicketId);
    }
  };

  if (!activeTicket) {
    return (
      <div className="ticket-chat-card empty-chat-state">
        <h3>No Ticket Selected</h3>
        <p>Select a ticket from the list to view conversation history and reply.</p>
      </div>
    );
  }

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
          {activeTicket.status !== 'resolved' && activeTicket.status !== 'closed' && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="chat-message-display">
        {/* Render ticket initial description as first bubble */}
        <div className="chat-message-bubble-row user">
          <div className="message-bubble">
            <span className="bubble-msg">{activeTicket.desc}</span>
          </div>
          <span className="bubble-meta">
            {activeTicket.userName} (Creator) • Original Ticket Issue
          </span>
        </div>

        {activeMessages.map((msg, i) => (
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

      {/* Input panel */}
      {activeTicket.status === 'resolved' || activeTicket.status === 'closed' ? (
        <div className="chat-closed-footer">
          This ticket is resolved/closed. Re-open from settings if needed.
        </div>
      ) : (
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
      )}
    </div>
  );
}

export default TicketChat;
