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
  github: {
    userId: { type: String, default: null },
    username: { type: String, default: null },
    accessToken: { type: String, default: null, select: false },
    scope: { type: String, default: null },
    connectedAt: { type: Date, default: null },
  },
  vercel: {
    accessToken: { type: String, default: null, select: false },
    connectedAt: { type: Date, default: null },
  },
  render: {
    apiKey: { type: String, default: null, select: false },
    connectedAt: { type: Date, default: null },
  },
  mfaEnabled: {
    type: Boolean,
    default: false
  },
  totpSecret: {
    type: String,
    default: null,
    select: false
  },
  pendingTotpSecret: {
    type: String,
    default: null,
    select: false
  },
  pendingTotpSecretCreatedAt: {
    type: Date,
    default: null,
    select: false
  },
  backupCodes: {
    type: [
      {
        hash: { type: String, required: true },
        usedAt: { type: Date, default: null }
      }
    ],
    default: [],
    select: false
  },
  trustedDevices: {
    type: [
      {
        deviceId: { type: String, required: true },
        tokenHash: { type: String, required: true },
        label: { type: String, default: null },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true },
        lastUsedAt: { type: Date, default: Date.now }
      }
    ],
    default: [],
    select: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
