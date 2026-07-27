const express = require('express');
const { getArchitecture, generateArchitecture } = require('../controllers/architectureController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getArchitecture);
router.post('/generate', generateArchitecture);

module.exports = router;
