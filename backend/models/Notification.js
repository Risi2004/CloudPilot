const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  targetTiers: [{
    type: String,
    enum: ['Free', 'Pro', 'Enterprise', 'All'],
    default: ['All']
  }],
  category: {
    type: String,
    enum: ['failures', 'agents', 'security', 'billing', 'general'],
    default: 'general'
  },
  severity: {
    type: String,
    enum: ['Info', 'Warning', 'Critical'],
    default: 'Info'
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
