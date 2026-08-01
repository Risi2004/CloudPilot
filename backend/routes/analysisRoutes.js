const express = require('express');
const { analyzeRepository, saveEnvVariables, getAnalyses } = require('../controllers/analysisController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getAnalyses);
router.post('/analyze', analyzeRepository);
router.post('/env', saveEnvVariables);

module.exports = router;
