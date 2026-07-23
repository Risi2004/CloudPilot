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

    // Check for plan expiration dynamically
    if (user.plan !== 'Free' && user.subscriptionExpiresAt && new Date() > new Date(user.subscriptionExpiresAt)) {
      if (user.autoRenew) {
        // BUG-007 fix: Auto-renewal must NOT create a COMPLETED transaction without
        // a real payment.  Extend the subscription date here (preserves access) but
        // do NOT log a transaction — that must only be done after a successful charge
        // via the payment processor.
        // TODO: Wire up the payment provider here and only call user.save() +
        //       create a Transaction after a successful charge response.
        const daysToAdd = user.billingCycle === 'annually' ? 365 : 30;
        const extensionDate = new Date(user.subscriptionExpiresAt);
        extensionDate.setDate(extensionDate.getDate() + daysToAdd);
        user.subscriptionExpiresAt = extensionDate;
        await user.save();
      } else {
        // Subscription expired, downgrade to Free plan
        user.plan = 'Free';
        user.billingCycle = 'none';
        user.subscriptionExpiresAt = null;
        await user.save();
      }
    }

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
