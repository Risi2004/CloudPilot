const express = require('express');
const {
  getPlan,
  startVerification,
  getVerification,
  listVerifications,
  stopVerification,
} = require('../controllers/verificationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', listVerifications);
router.post('/plan', getPlan);
router.post('/start', startVerification);
router.get('/:id', getVerification);
router.post('/:id/stop', stopVerification);

module.exports = router;
