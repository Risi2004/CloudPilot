const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
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
  repoFullName: {
    type: String,
    trim: true
  },
  detectedFiles: {
    type: [String],
    default: []
  },
  result: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  deploymentReadiness: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  status: {
    type: String,
    enum: ['completed', 'failed'],
    default: 'completed'
  },
  errorMessage: {
    type: String,
    default: null
  },
  envVariables: {
    type: [
      {
        key: { type: String, required: true, trim: true },
        value: { type: String, default: '' }
      }
    ],
    default: []
  },
  envConfigured: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

analysisSchema.index({ userId: 1, repoUrl: 1 }, { unique: true });

module.exports = mongoose.model('Analysis', analysisSchema);
