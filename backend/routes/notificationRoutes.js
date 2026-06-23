const express = require('express');
const {
  createNotification,
  getAllNotifications,
  updateNotification,
  deleteNotification,
  getMyNotifications,
  markNotificationRead
} = require('../controllers/notificationController');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// User endpoints (require logging in)
router.get('/my', protect, getMyNotifications);
router.post('/:id/read', protect, markNotificationRead);

// Admin endpoints (require logging in AND administrator status)
router.post('/', protect, admin, createNotification);
router.get('/', protect, admin, getAllNotifications);
router.put('/:id', protect, admin, updateNotification);
router.delete('/:id', protect, admin, deleteNotification);

module.exports = router;
