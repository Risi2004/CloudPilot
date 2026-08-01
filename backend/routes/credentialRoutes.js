const express = require('express');
const { getCredentials, connectCredential, deleteCredential } = require('../controllers/credentialController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getCredentials);
router.post('/', connectCredential);
router.delete('/:platform', deleteCredential);

module.exports = router;
