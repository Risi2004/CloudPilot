const express = require('express');
const { createPromotion, getPromotions, verifyPromotion, updatePromotion, deletePromotion } = require('../controllers/promotionController');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// Public route for landing page verification
router.get('/verify', verifyPromotion);

router.use(protect);
router.use(admin);

router.post('/', createPromotion);
router.get('/', getPromotions);
router.put('/:id', updatePromotion);
router.delete('/:id', deletePromotion);

module.exports = router;
