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
  mfaVerifyLogin,
  mfaSetupInit,
  mfaSetupVerify,
  mfaDisable,
  mfaStatus,
  mfaRevokeDevice
} = require('../controllers/authController');
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

// Multi-factor authentication (TOTP authenticator app)
router.post('/mfa/verify-login', mfaVerifyLogin);
router.post('/mfa/setup-init', protect, mfaSetupInit);
router.post('/mfa/setup-verify', protect, mfaSetupVerify);
router.post('/mfa/disable', protect, mfaDisable);
router.get('/mfa/status', protect, mfaStatus);
router.post('/mfa/revoke-device', protect, mfaRevokeDevice);

module.exports = router;
