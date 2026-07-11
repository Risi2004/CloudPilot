const express = require('express');
const {
  analyzeRepository,
  getAnalysisSession,
  saveAnalysisSessionEnv,
} = require('../controllers/repositoryController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.post('/analyze', analyzeRepository);
router.get('/session/:sessionId', getAnalysisSession);
router.get('/session', getAnalysisSession);
router.put('/session/:sessionId/env', saveAnalysisSessionEnv);

module.exports = router;
