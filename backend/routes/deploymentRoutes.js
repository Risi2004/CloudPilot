const express = require('express');
const { protect } = require('../middleware/auth');
const {
  deploymentStep,
  getDeploymentSession,
} = require('../controllers/deploymentController');

const router = express.Router();

router.use(protect);
router.post('/step', deploymentStep);
router.get('/session/:sessionId', getDeploymentSession);

module.exports = router;
