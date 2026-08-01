const mongoose = require('mongoose');

const checkSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'running', 'pass', 'fail', 'skipped'],
    default: 'pending'
  },
  fixable: { type: Boolean, default: false },
  message: { type: String, default: '' }
}, { _id: false });

const appliedFixSchema = new mongoose.Schema({
  componentName: { type: String, required: true },
  key: { type: String, required: true },
  newValue: { type: String, default: '' },
  reason: { type: String, default: '' }
}, { _id: false });

const attemptSchema = new mongoose.Schema({
  attemptNumber: { type: Number, required: true },
  checks: { type: [checkSchema], default: [] },
  appliedFixes: { type: [appliedFixSchema], default: [] },
  startedAt: { type: Date, default: null },
  finishedAt: { type: Date, default: null }
}, { _id: false });

const unresolvedSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  reason: { type: String, default: '' }
}, { _id: false });

const deploymentVerificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deploymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deployment',
    required: true
  },
  repoUrl: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending_review', 'running', 'succeeded', 'failed', 'stopping', 'stopped'],
    default: 'pending_review'
  },
  testPlan: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  attempt: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  checks: {
    type: [checkSchema],
    default: []
  },
  attemptHistory: {
    type: [attemptSchema],
    default: []
  },
  testAccount: {
    email: { type: String, default: null },
    cleanupAttempted: { type: Boolean, default: false },
    cleanedUp: { type: Boolean, default: false }
  },
  finalReport: {
    summary: { type: String, default: '' },
    unresolved: { type: [unresolvedSchema], default: [] }
  }
}, { timestamps: true });

deploymentVerificationSchema.index({ userId: 1, deploymentId: 1 });

module.exports = mongoose.model('DeploymentVerification', deploymentVerificationSchema);
