const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendNotificationEmail } = require('../utils/mailer');

// Create a new notification (Admin only)
const createNotification = async (req, res, next) => {
  try {
    const { title, message, targetTiers, category, severity } = req.body;

    if (!title || !message || !targetTiers || !Array.isArray(targetTiers) || targetTiers.length === 0) {
      return res.status(400).json({ message: 'Title, message, and target tiers (array) are required.' });
    }

    const notification = new Notification({
      title,
      message,
      targetTiers,
      category: category || 'general',
      severity: severity || 'Info',
      sender: req.user._id
    });

    await notification.save();

    // Query target users (excluding administrators)
    const query = { role: { $ne: 'admin' } };
    if (!targetTiers.includes('All')) {
      query.plan = { $in: targetTiers };
    }

    const usersToNotify = await User.find(query).select('email fullName');

    // Send emails asynchronously
    Promise.all(
      usersToNotify.map((u) =>
        sendNotificationEmail(u.email, u.fullName, title, message, 'created').catch((err) =>
          console.error(`Failed to send email to ${u.email}:`, err)
        )
      )
    ).catch((err) => console.error('Failed to notify users:', err));

    res.status(201).json(notification);
  } catch (err) {
    next(err);
  }
};

// Get all notifications (Admin only)
const getAllNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (err) {
    next(err);
  }
};

// Update an existing notification (Admin only)
const updateNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, message, targetTiers, category, severity } = req.body;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    if (title !== undefined) notification.title = title;
    if (message !== undefined) notification.message = message;
    if (targetTiers !== undefined) {
      if (!Array.isArray(targetTiers) || targetTiers.length === 0) {
        return res.status(400).json({ message: 'Target tiers must be a non-empty array.' });
      }
      notification.targetTiers = targetTiers;
    }
    if (category !== undefined) notification.category = category;
    if (severity !== undefined) notification.severity = severity;
    notification.updatedAt = Date.now();

    await notification.save();

    // Query target users based on updated configuration (excluding administrators)
    const query = { role: { $ne: 'admin' } };
    if (!notification.targetTiers.includes('All')) {
      query.plan = { $in: notification.targetTiers };
    }
    const usersToNotify = await User.find(query).select('email fullName');

    // Notify users of update
    Promise.all(
      usersToNotify.map((u) =>
        sendNotificationEmail(u.email, u.fullName, notification.title, notification.message, 'updated').catch((err) =>
          console.error(`Failed to send updated email to ${u.email}:`, err)
        )
      )
    ).catch((err) => console.error('Failed to notify updated users:', err));

    res.status(200).json(notification);
  } catch (err) {
    next(err);
  }
};

// Delete a notification (Admin only)
const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    // Query target users before deleting from database (excluding administrators)
    const query = { role: { $ne: 'admin' } };
    if (!notification.targetTiers.includes('All')) {
      query.plan = { $in: notification.targetTiers };
    }
    const usersToNotify = await User.find(query).select('email fullName');

    // Notify users of deletion
    Promise.all(
      usersToNotify.map((u) =>
        sendNotificationEmail(u.email, u.fullName, notification.title, notification.message, 'deleted').catch((err) =>
          console.error(`Failed to send deletion email to ${u.email}:`, err)
        )
      )
    ).catch((err) => console.error('Failed to notify deleted users:', err));

    await Notification.findByIdAndDelete(id);

    res.status(200).json({ message: 'Notification deleted and target users notified.' });
  } catch (err) {
    next(err);
  }
};

// Get notifications for logged in user
const getMyNotifications = async (req, res, next) => {
  try {
    const userCreatedAt = req.user.createdAt || new Date(0);
    const notifications = await Notification.find({
      $or: [
        { targetTiers: req.user.plan },
        { targetTiers: 'All' }
      ],
      createdAt: { $gte: userCreatedAt }
    }).sort({ createdAt: -1 });

    const response = notifications.map((n) => ({
      _id: n._id,
      title: n.title,
      message: n.message,
      category: n.category,
      severity: n.severity,
      createdAt: n.createdAt,
      read: n.readBy.includes(req.user._id)
    }));

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};

// Mark a notification as read
const markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    // Check if user is eligible to read it
    const userCreatedAt = req.user.createdAt || new Date(0);
    const planMatch = notification.targetTiers.includes('All') || notification.targetTiers.includes(req.user.plan);
    const timeMatch = new Date(notification.createdAt) >= new Date(userCreatedAt);
    if (!planMatch || !timeMatch) {
      return res.status(403).json({ message: 'Access denied to this notification.' });
    }

    if (!notification.readBy.includes(req.user._id)) {
      notification.readBy.push(req.user._id);
      await notification.save();
    }

    res.status(200).json({ message: 'Notification marked as read.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createNotification,
  getAllNotifications,
  updateNotification,
  deleteNotification,
  getMyNotifications,
  markNotificationRead
};
