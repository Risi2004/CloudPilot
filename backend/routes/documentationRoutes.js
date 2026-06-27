const express = require('express');
const { queryDocumentation } = require('../controllers/documentationController');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(admin);

router.post('/query', queryDocumentation);

module.exports = router;
