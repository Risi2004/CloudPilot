const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const User = require('../models/User');
const PendingUser = require('../models/PendingUser');
const { uploadBase64Image, getPrivateImageStream, deleteImage } = require('../config/s3');
const { sendOtpEmail, sendOnboardEmail, sendMfaEnabledEmail, sendMfaDisabledEmail } = require('../utils/mailer');
const { verifyIdToken } = require('../config/firebase');

// Regular Expressions for field validation
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

// Trusted-device "remember me" window for skipping MFA on subsequent logins
const TRUSTED_DEVICE_DAYS = 7;

// Helper to generate 6-digit verification code
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper to hash a raw device token before persisting (never store the raw token)
const hashDeviceToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Helper to derive a human-readable device label from the request's User-Agent
const generateDeviceLabel = (req) => {
  const ua = req.headers['user-agent'] || 'Unknown device';
  return ua.length > 120 ? ua.slice(0, 120) : ua;
};

/**
 * Initiate user signup, handles input verification, password hashing, 
 * private profile image upload, and OTP email dispatch.
 */
const signup = async (req, res, next) => {
  try {
    const { email, password, profileImage, fullName } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ message: 'Full Name, Access Identifier and Encryption Key are required.' });
    }

    if (typeof fullName !== 'string' || fullName.trim().length < 2) {
      return res.status(400).json({ message: 'Full Name must be at least 2 characters long.' });
    }

    const trimmedFullName = fullName.trim();
    const normalizedEmail = email.toLowerCase().trim();

    // Regex checks
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Invalid Access Identifier format. Must be a valid email address.' });
    }

    if (!passwordRegex.test(password)) {
      return res.status(400).json({ message: 'Encryption Key must be at least 8 characters long and contain both letters and numbers.' });
    }

    // Profile Image validation (only jpg, jpeg, png, limit 5MB)
    if (profileImage) {
      const mimeMatch = profileImage.match(/^data:(image\/(jpeg|jpg|png));base64,/);
      if (!mimeMatch) {
        return res.status(400).json({ message: 'Invalid profile image format. Only JPG, JPEG, and PNG are accepted.' });
      }
      
      const base64Data = profileImage.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({ message: 'Profile image size exceeds the 5MB limit.' });
      }
    }

    // Check if email already registered in final User db
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'Access Identifier is already registered.' });
    }

    const now = Date.now();

    // Check if there is an existing pending signup for this email
    let pendingUser = await PendingUser.findOne({ email: normalizedEmail });

    if (pendingUser) {
      // Check 5-minute resend throttling
      const timeDiff = now - new Date(pendingUser.otpCreatedAt).getTime();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (timeDiff < fiveMinutes) {
        const secondsRemaining = Math.ceil((fiveMinutes - timeDiff) / 1000);
        const minutes = Math.floor(secondsRemaining / 60);
        const seconds = secondsRemaining % 60;
        return res.status(429).json({ 
          message: `Please wait ${minutes}m ${seconds}s before requesting a new authorization code.`,
          countdown: secondsRemaining
        });
      }

      // Overwrite/Update pending user details
      let newImageKey = pendingUser.profileImageKey;
      if (profileImage) {
        // If a new image is provided, delete the old one first
        if (pendingUser.profileImageKey) {
          await deleteImage(pendingUser.profileImageKey);
        }
        newImageKey = await uploadBase64Image(profileImage, normalizedEmail);
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newOtp = generateOTP();

      pendingUser.fullName = trimmedFullName;
      pendingUser.password = hashedPassword;
      pendingUser.profileImageKey = newImageKey;
      pendingUser.otp = newOtp;
      pendingUser.otpCreatedAt = now;
      pendingUser.createdAt = now; // Reset TTL timer
      await pendingUser.save();

      // Dispatch new OTP email
      await sendOtpEmail(normalizedEmail, newOtp);
      return res.status(200).json({ 
        message: 'Security authorization code resent. Please verify your email.',
        email: normalizedEmail
      });
    }

    // No existing pending registration, create new one
    let imageKey = null;
    if (profileImage) {
      imageKey = await uploadBase64Image(profileImage, normalizedEmail);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();

    pendingUser = new PendingUser({
      email: normalizedEmail,
      fullName: trimmedFullName,
      password: hashedPassword,
      profileImageKey: imageKey,
      otp,
      otpCreatedAt: now,
      createdAt: now
    });

    await pendingUser.save();

    // Dispatch OTP email
    await sendOtpEmail(normalizedEmail, otp);

    res.status(201).json({
      message: 'Security authorization code dispatched. Please check your email.',
      email: normalizedEmail
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'An authorization session is already active for this Access Identifier. Check your inbox or wait 5 minutes.' });
    }
    next(err);
  }
};

/**
 * Resend OTP code to the email if 5 minutes have elapsed since the last generation.
 */
const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Access Identifier is required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const pendingUser = await PendingUser.findOne({ email: normalizedEmail });

    if (!pendingUser) {
      return res.status(404).json({ message: 'No active registration session found. Please sign up again.' });
    }

    const now = Date.now();
    const timeDiff = now - new Date(pendingUser.otpCreatedAt).getTime();
    const fiveMinutes = 5 * 60 * 1000;

    if (timeDiff < fiveMinutes) {
      const secondsRemaining = Math.ceil((fiveMinutes - timeDiff) / 1000);
      const minutes = Math.floor(secondsRemaining / 60);
      const seconds = secondsRemaining % 60;
      return res.status(429).json({ 
        message: `Please wait ${minutes}m ${seconds}s before requesting a new authorization code.` 
      });
    }

    const newOtp = generateOTP();
    pendingUser.otp = newOtp;
    pendingUser.otpCreatedAt = now;
    pendingUser.createdAt = now; // Reset TTL timer
    await pendingUser.save();

    await sendOtpEmail(normalizedEmail, newOtp);

    res.status(200).json({ message: 'New security authorization code dispatched.' });
  } catch (err) {
    next(err);
  }
};

/**
 * Verify OTP, promote pending user to database and generate authorization token.
 */
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Access Identifier and Authorization Code are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const pendingUser = await PendingUser.findOne({ email: normalizedEmail });

    if (!pendingUser) {
      return res.status(400).json({ message: 'Invalid or expired authorization session. Please sign up again.' });
    }

    // Verify OTP matching
    if (pendingUser.otp !== otp.trim()) {
      return res.status(400).json({ message: 'Invalid security code.' });
    }

    // Create final User record
    const user = new User({
      email: pendingUser.email,
      fullName: pendingUser.fullName,
      password: pendingUser.password,
      profileImageKey: pendingUser.profileImageKey,
      role: pendingUser.email === 'admin@gmail.com' ? 'admin' : 'user',
      plan: 'Free'
    });

    await user.save();

    // Clean up pending registration
    await PendingUser.deleteOne({ _id: pendingUser._id });

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'jwt_secret_fallback',
      { expiresIn: '7d' }
    );

    // Send welcome onboarding email asynchronously (do not block client response)
    sendOnboardEmail(user.email).catch(e => console.error('Error sending onboarding welcome email:', e));

    res.status(200).json({
      message: 'Fleet registration verified successfully.',
      token,
      user: {
        email: user.email,
        fullName: user.fullName,
        profileImageKey: user.profileImageKey,
        role: user.role,
        plan: user.plan
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Handle user session login and return signed JWT.
 */
const login = async (req, res, next) => {
  try {
    const { email, password, deviceToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Access Identifier and Encryption Key are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Regex check on email
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Invalid Access Identifier format. Must be a valid email address.' });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: Invalid credentials.' });
    }

    if (user.status === 'Suspended') {
      return res.status(403).json({ message: 'Your account has been suspended by an administrator. For further information, please contact support.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Unauthorized: Invalid credentials.' });
    }

    // Auto-promote admin email if not already admin
    if (user.email === 'admin@gmail.com' && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    // If MFA is enabled, require a verified authenticator code unless this device
    // was already trusted (remembered) within the last TRUSTED_DEVICE_DAYS days.
    if (user.mfaEnabled) {
      const now = new Date();
      const isDeviceTrusted = !!(deviceToken && user.trustedDevices.some(
        (d) => d.tokenHash === hashDeviceToken(deviceToken) && new Date(d.expiresAt) > now
      ));

      if (!isDeviceTrusted) {
        const mfaToken = jwt.sign(
          { id: user._id, purpose: 'mfa' },
          process.env.JWT_SECRET || 'jwt_secret_fallback',
          { expiresIn: '10m' }
        );

        return res.status(200).json({
          mfaRequired: true,
          mfaToken,
          message: 'Enter the code from your authenticator app to continue.'
        });
      }
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'jwt_secret_fallback',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        email: user.email,
        fullName: user.fullName,
        profileImageKey: user.profileImageKey,
        role: user.role,
        plan: user.plan
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Complete login after a valid MFA code is provided, issuing the final JWT.
 * Optionally remembers this device for TRUSTED_DEVICE_DAYS to skip future MFA prompts.
 */
const mfaVerifyLogin = async (req, res, next) => {
  try {
    const { mfaToken, code, rememberDevice } = req.body;

    if (!mfaToken || !code) {
      return res.status(400).json({ message: 'MFA session token and authentication code are required.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(mfaToken, process.env.JWT_SECRET || 'jwt_secret_fallback');
    } catch (e) {
      return res.status(401).json({ message: 'MFA session expired. Please log in again.' });
    }

    if (decoded.purpose !== 'mfa') {
      return res.status(401).json({ message: 'Invalid MFA session token.' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: User no longer exists.' });
    }

    if (user.status === 'Suspended') {
      return res.status(403).json({ message: 'Your account has been suspended by an administrator. For further information, please contact support.' });
    }

    if (!user.mfaEnabled || !user.mfaSecret) {
      return res.status(400).json({ message: 'Multi-factor authentication is not enabled on this account.' });
    }

    const cleanCode = String(code).replace(/\D/g, '').padStart(6, '0');
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: cleanCode,
      window: 6
    });

    if (!verified) {
      return res.status(401).json({ message: 'Invalid authentication code.' });
    }

    let deviceToken = null;
    if (rememberDevice) {
      const now = new Date();
      // Prune expired entries before adding a new one
      user.trustedDevices = user.trustedDevices.filter((d) => new Date(d.expiresAt) > now);

      deviceToken = crypto.randomBytes(32).toString('hex');
      user.trustedDevices.push({
        tokenHash: hashDeviceToken(deviceToken),
        label: generateDeviceLabel(req),
        expiresAt: new Date(now.getTime() + TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000)
      });
    }

    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'jwt_secret_fallback',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful.',
      token,
      deviceToken,
      user: {
        email: user.email,
        fullName: user.fullName,
        profileImageKey: user.profileImageKey,
        role: user.role,
        plan: user.plan
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Begin MFA enrollment: generate a TOTP secret and return a scannable QR code.
 * The secret is held as "temp" until confirmed via mfaSetupVerify.
 */
const mfaSetupInit = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.mfaEnabled) {
      return res.status(400).json({ message: 'Multi-factor authentication is already enabled.' });
    }

    const secret = speakeasy.generateSecret({
      name: `CloudPilot:${user.email}`,
      length: 20
    });

    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret.base32,
      label: `CloudPilot:${user.email}`,
      issuer: 'CloudPilot',
      encoding: 'base32'
    });

    user.mfaTempSecret = secret.base32;
    await user.save();

    const qrCode = await qrcode.toDataURL(otpauthUrl);

    res.status(200).json({
      message: 'Scan the QR code with your authenticator app, then enter the generated code to confirm.',
      qrCode,
      secret: secret.base32
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Confirm MFA enrollment by validating a code generated from the pending secret.
 */
const mfaSetupVerify = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Authentication code is required.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!user.mfaTempSecret) {
      return res.status(400).json({ message: 'No pending MFA setup found. Please restart setup.' });
    }

    const cleanToken = String(token).replace(/\D/g, '').padStart(6, '0');
    const verified = speakeasy.totp.verify({
      secret: user.mfaTempSecret,
      encoding: 'base32',
      token: cleanToken,
      window: 6
    });

    if (!verified) {
      return res.status(400).json({ message: 'Invalid authentication code. Please try again.' });
    }

    user.mfaSecret = user.mfaTempSecret;
    user.mfaTempSecret = null;
    user.mfaEnabled = true;
    await user.save();

    // Dispatch security notification email
    await sendMfaEnabledEmail(user.email, user.fullName);

    res.status(200).json({ message: 'Two-factor authentication has been enabled.', mfaEnabled: true });
  } catch (err) {
    next(err);
  }
};

/**
 * Disable MFA on the account (requires password confirmation) and clear trusted devices.
 */
const mfaDisable = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: 'Password confirmation is required to disable MFA.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!user.password) {
      return res.status(400).json({ message: 'Password confirmation is unavailable for OAuth-only accounts.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password.' });
    }

    user.mfaEnabled = false;
    user.mfaSecret = null;
    user.mfaTempSecret = null;
    user.trustedDevices = [];
    await user.save();

    // Dispatch security deactivation email
    await sendMfaDisabledEmail(user.email, user.fullName);

    res.status(200).json({ message: 'Two-factor authentication has been disabled.', mfaEnabled: false });
  } catch (err) {
    next(err);
  }
};

/**
 * Return the current MFA status and list of active trusted devices for the profile page.
 */
const mfaStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const now = new Date();
    const trustedDevices = user.trustedDevices
      .filter((d) => new Date(d.expiresAt) > now)
      .map((d) => ({
        id: d._id,
        label: d.label,
        createdAt: d.createdAt,
        expiresAt: d.expiresAt
      }));

    res.status(200).json({ mfaEnabled: user.mfaEnabled, trustedDevices });
  } catch (err) {
    next(err);
  }
};

/**
 * Revoke a single trusted device (or all of them), forcing an MFA prompt on its next login.
 */
const mfaRevokeDevice = async (req, res, next) => {
  try {
    const { deviceId, all } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (all) {
      user.trustedDevices = [];
    } else {
      if (!deviceId) {
        return res.status(400).json({ message: 'Device ID is required.' });
      }
      user.trustedDevices = user.trustedDevices.filter((d) => d._id.toString() !== deviceId);
    }

    await user.save();

    const now = new Date();
    const trustedDevices = user.trustedDevices
      .filter((d) => new Date(d.expiresAt) > now)
      .map((d) => ({
        id: d._id,
        label: d.label,
        createdAt: d.createdAt,
        expiresAt: d.expiresAt
      }));

    res.status(200).json({
      message: all ? 'All trusted devices have been revoked.' : 'Device has been revoked.',
      trustedDevices
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Securely serve the private profile image from Cloudflare R2.
 */
const getProfileImage = async (req, res, next) => {
  try {
    const { filename } = req.params;
    const key = `avatars/${filename}`;
    
    const { stream, contentType } = await getPrivateImageStream(key);
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    
    // Pipe the response body stream to express response
    if (typeof stream.pipe === 'function') {
      stream.pipe(res);
    } else {
      // In newer SDK versions Body is a ReadableStream / Web stream or Blob, handle buffer conversions
      const bytes = await stream.transformToByteArray();
      res.send(Buffer.from(bytes));
    }
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.code === 'NoSuchKey') {
      res.status(404).json({ message: 'Profile image not found.' });
    } else {
      next(err);
    }
  }
};

/**
 * Verify JWT token validity and return authenticated user details.
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No authorization token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jwt_secret_fallback');

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Authorization error: User no longer exists.' });
    }

    if (user.status === 'Suspended') {
      return res.status(403).json({ message: 'Your account has been suspended by an administrator. For further information, please contact support.' });
    }

    res.status(200).json({
      message: 'Token verified successfully.',
      user: {
        email: user.email,
        fullName: user.fullName,
        profileImageKey: user.profileImageKey,
        role: user.role,
        plan: user.plan,
        billingCycle: user.billingCycle,
        autoRenew: user.autoRenew,
        subscriptionExpiresAt: user.subscriptionExpiresAt
      }
    });
  } catch (err) {
    res.status(401).json({ message: 'Authorization error: Session expired or invalid.' });
  }
};

/**
 * Update user profile details (Full Name, Password, and Profile Image).
 */
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fullName, currentPassword, newPassword, profileImage } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Optional: If changing password, verify current password first
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to change password.' });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid current password.' });
      }
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({ message: 'New Encryption Key must be at least 8 characters long and contain both letters and numbers.' });
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }

    // Update full name if provided
    if (fullName) {
      if (typeof fullName !== 'string' || fullName.trim().length < 2) {
        return res.status(400).json({ message: 'Full Name must be at least 2 characters long.' });
      }
      user.fullName = fullName.trim();
    }

    // Update profile image if provided
    if (profileImage) {
      // Validate image type & size
      const mimeMatch = profileImage.match(/^data:(image\/(jpeg|jpg|png));base64,/);
      if (!mimeMatch) {
        return res.status(400).json({ message: 'Invalid profile image format. Only JPG, JPEG, and PNG are accepted.' });
      }
      const base64Data = profileImage.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({ message: 'Profile image size exceeds the 5MB limit.' });
      }

      // Delete old image if it exists in R2
      if (user.profileImageKey) {
        try {
          await deleteImage(user.profileImageKey);
        } catch (e) {
          console.error('Error deleting old profile image:', e);
        }
      }

      // Upload new image
      const newKey = await uploadBase64Image(profileImage, user.email);
      user.profileImageKey = newKey;
    }

    await user.save();

    res.status(200).json({
      message: 'Profile updated successfully.',
      user: {
        email: user.email,
        fullName: user.fullName,
        profileImageKey: user.profileImageKey,
        plan: user.plan
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Handle session login/registration using Firebase ID Token.
 */
const firebaseLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: 'Firebase ID token is required.' });
    }

    // Verify token using our firebase-admin config helper
    const decodedToken = await verifyIdToken(idToken);
    const email = decodedToken.email ? decodedToken.email.toLowerCase().trim() : null;
    const name = decodedToken.name || decodedToken.email || 'CloudPilot Fleet Officer';

    if (!email) {
      return res.status(400).json({ message: 'Email address not found in Firebase token.' });
    }

    // Find or create user in MongoDB
    let user = await User.findOne({ email });

    if (user && user.status === 'Suspended') {
      return res.status(403).json({ message: 'Your account has been suspended by an administrator. For further information, please contact support.' });
    }

    if (!user) {
      // First-time login / Registration for this OAuth user
      user = new User({
        email,
        fullName: name.trim(),
        role: email === 'admin@gmail.com' ? 'admin' : 'user',
        password: undefined, // No password since they use OAuth
        plan: 'Free'
      });
      await user.save();
    }

    // Generate JWT token for subsequent API requests (consistent with credentials login)
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'jwt_secret_fallback',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Firebase login successful.',
      token,
      user: {
        email: user.email,
        fullName: user.fullName,
        profileImageKey: user.profileImageKey,
        role: user.role,
        plan: user.plan
      }
    });
  } catch (err) {
    res.status(401).json({ message: 'Authentication failed: ' + err.message });
  }
};

/**
 * Update user's last activity timestamp (called via periodic heartbeat pings when active)
 */
const updateUserActivity = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    user.lastActivity = new Date();
    await user.save();
    res.status(200).json({ message: 'Activity timestamp updated.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  signup,
  resendOtp,
  verifyOtp,
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
};
