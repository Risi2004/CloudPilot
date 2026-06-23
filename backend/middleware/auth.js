const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
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

    req.user = user;

    // Rate-limit lastActivity updates to at most once per 60 seconds to avoid DB bottlenecks
    const now = new Date();
    if (!user.lastActivity || (now - new Date(user.lastActivity)) > 60 * 1000) {
      User.findByIdAndUpdate(user._id, { lastActivity: now }).catch(err => {
        console.error('Failed to update last activity in protect middleware:', err);
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Authorization error: Session expired or invalid.' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied: Administrator privileges required.' });
  }
};

module.exports = { protect, admin };
