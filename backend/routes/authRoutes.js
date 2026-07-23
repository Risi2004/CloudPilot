const express = require('express');
const {
  signup,
  verifyOtp,
  resendOtp,
  login,
  firebaseLogin,
  getProfileImage,
  verifyToken,
  updateProfile,
  updateUserActivity,
} = require('../controllers/authController');
const {
  setupMfa,
  enableMfa,
  disableMfa,
  verifyMfaLogin,
  getMfaStatus,
  regenerateBackupCodes,
} = require('../controllers/mfaController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/signup', signup);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', login);
router.post('/firebase-login', firebaseLogin);
router.get('/profile-image/:filename', getProfileImage);
router.get('/verify', verifyToken);
router.put('/update-profile', protect, updateProfile);
router.post('/activity', protect, updateUserActivity);

router.post('/mfa/setup', protect, setupMfa);
router.post('/mfa/enable', protect, enableMfa);
router.post('/mfa/disable', protect, disableMfa);
router.post('/mfa/verify-login', verifyMfaLogin);
router.get('/mfa/status', protect, getMfaStatus);
router.post('/mfa/regenerate-backup-codes', protect, regenerateBackupCodes);

module.exports = router;
