const express = require('express');
const {
  getConnectUrl,
  handleCallback,
  getConnectionStatus,
  listRepositories,
  disconnectGitHub,
} = require('../controllers/githubController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/callback', handleCallback);

router.use(protect);
router.get('/connect', getConnectUrl);
router.get('/status', getConnectionStatus);
router.get('/repos', listRepositories);
router.delete('/disconnect', disconnectGitHub);

module.exports = router;
