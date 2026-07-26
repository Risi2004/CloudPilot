const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['agent', 'user'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  quickReplies: {
    type: [String],
    default: undefined
  }
}, { timestamps: true, _id: false });

const platformInterviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  repoUrl: {
    type: String,
    required: true,
    trim: true
  },
  messages: {
    type: [messageSchema],
    default: []
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed'],
    default: 'in_progress'
  },
  recommendation: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, { timestamps: true });

platformInterviewSchema.index({ userId: 1, repoUrl: 1 }, { unique: true });

module.exports = mongoose.model('PlatformInterview', platformInterviewSchema);
