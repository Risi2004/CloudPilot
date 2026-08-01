const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: false
  },
  profileImageKey: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  plan: {
    type: String,
    enum: ['Free', 'Pro', 'Enterprise'],
    default: 'Free'
  },
  status: {
    type: String,
    enum: ['Active', 'Suspended'],
    default: 'Active'
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'annually', 'none'],
    default: 'none'
  },
  autoRenew: {
    type: Boolean,
    default: true
  },
  subscriptionExpiresAt: {
    type: Date,
    default: null
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  mfaEnabled: {
    type: Boolean,
    default: false
  },
  mfaSecret: {
    type: String,
    default: null
  },
  mfaTempSecret: {
    type: String,
    default: null
  },
  trustedDevices: {
    type: [
      {
        tokenHash: { type: String, required: true },
        label: { type: String, default: 'Unknown device' },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true }
      }
    ],
    default: []
  }
});

module.exports = mongoose.model('User', userSchema);
