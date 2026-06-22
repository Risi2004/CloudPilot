const express = require('express');
const { createTicket, getTickets, addMessage, updateTicketStatus } = require('../controllers/ticketController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All support endpoints require authentication
router.use(protect);

router.post('/', createTicket);
router.get('/', getTickets);
router.post('/:id/messages', addMessage);
router.put('/:id/status', updateTicketStatus);

module.exports = router;
