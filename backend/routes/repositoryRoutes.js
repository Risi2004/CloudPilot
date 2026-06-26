const express = require('express');
const { analyzeRepository } = require('../controllers/repositoryController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.post('/analyze', analyzeRepository);

module.exports = router;
