const express = require('express');
const { getRevenueStats } = require('../controllers/revenueController');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// Protect all routes with auth + admin checks
router.use(protect);
router.use(admin);

router.get('/stats', getRevenueStats);

module.exports = router;
