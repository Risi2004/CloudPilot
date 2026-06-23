const User = require('../models/User');
const Ticket = require('../models/Ticket');
const { deleteImage } = require('../config/s3');
const { sendSuspensionEmail, sendReactivationEmail, sendDeletionEmail } = require('../utils/mailer');

// Get all users (Admin only)
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } }).select('-password').sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (err) {
    next(err);
  }
};

// Update user status or plan (Admin only)
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, plan, role } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    let statusChanged = false;
    let oldStatus = user.status || 'Active';

    // Update fields if provided
    if (status !== undefined) {
      if (!['Active', 'Suspended'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value.' });
      }
      if (user.status !== status) {
        user.status = status;
        statusChanged = true;
      }
    }

    if (plan !== undefined) {
      if (!['Free', 'Pro', 'Enterprise'].includes(plan)) {
        return res.status(400).json({ message: 'Invalid plan value.' });
      }
      user.plan = plan;
    }

    if (role !== undefined) {
      if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role value.' });
      }
      user.role = role;
    }

    user.lastActivity = new Date();
    await user.save();

    // Send async email notification if status changed
    if (statusChanged) {
      if (user.status === 'Suspended') {
        sendSuspensionEmail(user.email, user.fullName)
          .catch(err => console.error(`Failed to send suspension email to ${user.email}:`, err));
      } else if (user.status === 'Active' && oldStatus === 'Suspended') {
        sendReactivationEmail(user.email, user.fullName)
          .catch(err => console.error(`Failed to send reactivation email to ${user.email}:`, err));
      }
    }

    res.status(200).json({ message: 'User updated successfully.', user });
  } catch (err) {
    next(err);
  }
};

// Delete user account and all associated data (Admin only)
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // 1. Delete profile image from Cloudflare R2 if it exists
    if (user.profileImageKey) {
      try {
        await deleteImage(user.profileImageKey);
      } catch (err) {
        console.error(`Failed to delete profile image for user ${user.email}:`, err);
      }
    }

    // 2. Delete all tickets belonging to the user
    await Ticket.deleteMany({ user: id });

    // 3. Dispatch account deletion email
    try {
      await sendDeletionEmail(user.email, user.fullName);
    } catch (err) {
      console.error(`Failed to send account deletion email to ${user.email}:`, err);
    }

    // 4. Delete user document from Database
    await User.findByIdAndDelete(id);

    res.status(200).json({ message: 'User and all associated data deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllUsers,
  updateUser,
  deleteUser
};
