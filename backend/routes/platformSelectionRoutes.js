const express = require('express');
const { getInterview, startInterview, postMessage } = require('../controllers/platformSelectionController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getInterview);
router.post('/start', startInterview);
router.post('/message', postMessage);

module.exports = router;
