const express = require('express');
const {
  generateArchitecture,
  getArchitectureSession,
} = require('../controllers/architectureController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.post('/generate', generateArchitecture);
router.get('/session/:sessionId', getArchitectureSession);

module.exports = router;
