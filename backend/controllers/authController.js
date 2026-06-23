const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const PendingUser = require('../models/PendingUser');
const { uploadBase64Image, getPrivateImageStream, deleteImage } = require('../config/s3');
const { sendOtpEmail, sendOnboardEmail } = require('../utils/mailer');
const { verifyIdToken } = require('../config/firebase');

// Regular Expressions for field validation
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

// Helper to generate 6-digit verification code
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
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
      role: pendingUser.email === 'admin@gmail.com' ? 'admin' : 'user'
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
        role: user.role
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
    const { email, password } = req.body;

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
        role: user.role
      }
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
        role: user.role
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
        profileImageKey: user.profileImageKey
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
        password: undefined // No password since they use OAuth
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
        role: user.role
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
  updateUserActivity
};
