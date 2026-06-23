const express = require('express');
const { initiatePayment, payhereNotify, subscribeFree, confirmPayment } = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Initiation payment settings hash (Authenticated user)
router.post('/initiate', protect, initiatePayment);

// Subscribe directly to a Free plan (no payment required)
router.post('/subscribe-free', protect, subscribeFree);

// Local confirmation bypass (Authenticated user)
router.post('/confirm', protect, confirmPayment);

// PayHere Server Webhook Callback (Public IPN)
router.post('/notify', payhereNotify);

module.exports = router;
