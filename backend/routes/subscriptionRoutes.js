const express = require('express');
const { getSubscriptions, createSubscription, updateSubscription, deleteSubscription, cancelSubscription } = require('../controllers/subscriptionController');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// Apply GET as public, and protect + admin to write endpoints
router.get('/', getSubscriptions);
router.post('/cancel', protect, cancelSubscription);
router.post('/', protect, admin, createSubscription);
router.put('/:id', protect, admin, updateSubscription);
router.delete('/:id', protect, admin, deleteSubscription);

module.exports = router;
