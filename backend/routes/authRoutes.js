const express = require('express');
const { signup, verifyOtp, resendOtp, login, getProfileImage, verifyToken, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/signup', signup);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', login);
router.get('/profile-image/:filename', getProfileImage);
router.get('/verify', verifyToken);
router.put('/update-profile', protect, updateProfile);

module.exports = router;
