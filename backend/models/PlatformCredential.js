const mongoose = require('mongoose');

const platformCredentialSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  platform: {
    type: String,
    enum: ['render', 'vercel'],
    required: true
  },
  encryptedApiKey: {
    type: String,
    required: true
  },
  maskedKey: {
    type: String,
    required: true
  },
  accountLabel: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  lastValidatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

platformCredentialSchema.index({ userId: 1, platform: 1 }, { unique: true });

module.exports = mongoose.model('PlatformCredential', platformCredentialSchema);
