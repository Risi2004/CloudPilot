const express = require('express');
const {
  platformSelectionStep,
  getPlatformSelectionSession,
} = require('../controllers/platformSelectionController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.post('/step', platformSelectionStep);
router.get('/session/:sessionId', getPlatformSelectionSession);

module.exports = router;
