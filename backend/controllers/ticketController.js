const Ticket = require('../models/Ticket');

/**
 * Generate a unique #CP-XXXX ticket ID
 */
const generateTicketId = async () => {
  let isUnique = false;
  let ticketId = '';
  while (!isUnique) {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    ticketId = `#CP-${randomNum}`;
    const existing = await Ticket.findOne({ id: ticketId });
    if (!existing) {
      isUnique = true;
    }
  }
  return ticketId;
};

/**
 * Create a new support ticket
 */
const createTicket = async (req, res, next) => {
  try {
    const { subject, desc, priority } = req.body;
    if (!subject || !desc) {
      return res.status(400).json({ message: 'Subject and Description are required.' });
    }

    const ticketId = await generateTicketId();
    const newTicket = new Ticket({
      id: ticketId,
      user: req.user.id,
      userName: req.user.fullName,
      subject: subject.trim(),
      desc: desc.trim(),
      priority: priority || 'Med',
      status: 'open',
      admin: 'Unassigned',
      messages: [
        {
          sender: 'system',
          senderName: 'System',
          text: 'Ticket opened. Our support fleet has been notified and will respond shortly.'
        }
      ]
    });

    await newTicket.save();
    res.status(201).json({ message: 'Ticket raised successfully.', ticket: newTicket });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieve all tickets (or only user's tickets if not admin)
 */
const getTickets = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') {
      query.user = req.user.id;
    }

    // Sort by newest first
    const tickets = await Ticket.find(query).sort({ createdAt: -1 });
    res.status(200).json(tickets);
  } catch (err) {
    next(err);
  }
};

/**
 * Post a new chat message to a ticket thread
 */
const addMessage = async (req, res, next) => {
  try {
    const { id } = req.params; // ticket code e.g. #CP-8922 or MongoDB _id
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Message text is required.' });
    }

    // Find by either standard id code or Mongo _id
    let ticket = await Ticket.findOne({ $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] });
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    // Check authorization: non-admins can only post to their own tickets
    if (req.user.role !== 'admin' && ticket.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const senderRole = req.user.role === 'admin' ? 'admin' : 'user';
    const message = {
      sender: senderRole,
      senderName: req.user.fullName,
      text: text.trim(),
      createdAt: new Date()
    };

    ticket.messages.push(message);

    // Auto-assign to admin if first reply from admin
    if (req.user.role === 'admin') {
      if (ticket.admin === 'Unassigned') {
        ticket.admin = req.user.fullName;
      }
      if (ticket.status === 'open') {
        ticket.status = 'in-progress';
      }
    }

    await ticket.save();
    res.status(200).json({ message: 'Message added successfully.', ticket });
  } catch (err) {
    next(err);
  }
};

/**
 * Update ticket properties (status or assigned admin)
 */
const updateTicketStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminName } = req.body;

    let ticket = await Ticket.findOne({ $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] });
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    // Non-admins can only close/resolve their own tickets, cannot change admin assignees
    if (req.user.role !== 'admin') {
      if (ticket.user.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied.' });
      }
      if (status && !['resolved', 'closed'].includes(status)) {
        return res.status(400).json({ message: 'Users can only mark tickets as resolved or closed.' });
      }
    }

    if (status) {
      ticket.status = status;
    }
    if (adminName && req.user.role === 'admin') {
      ticket.admin = adminName;
    }

    await ticket.save();
    res.status(200).json({ message: 'Ticket updated successfully.', ticket });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createTicket,
  getTickets,
  addMessage,
  updateTicketStatus
};
