const mongoose = require('mongoose');

const pendingUserSchema = new mongoose.Schema({
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
    required: true
  },
  profileImageKey: {
    type: String,
    default: null
  },
  otp: {
    type: String,
    required: true
  },
  otpCreatedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now,
    expires: 900 // document self-destructs after 15 minutes
  }
});

module.exports = mongoose.model('PendingUser', pendingUserSchema);
