const express = require('express');
const { analyzeRepository, saveEnvVariables } = require('../controllers/analysisController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/analyze', analyzeRepository);
router.post('/env', saveEnvVariables);

module.exports = router;
