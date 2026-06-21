const express = require('express');
const { signup, verifyOtp, resendOtp, login, getProfileImage, verifyToken } = require('../controllers/authController');

const router = express.Router();

router.post('/signup', signup);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', login);
router.get('/profile-image/:filename', getProfileImage);
router.get('/verify', verifyToken);

module.exports = router;
