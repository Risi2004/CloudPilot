const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'running', 'success', 'failed', 'skipped'],
    default: 'pending'
  },
  startedAt: { type: Date, default: null },
  finishedAt: { type: Date, default: null },
  message: { type: String, default: '' },
  logs: { type: [String], default: [] }
}, { _id: false });

const resourceSchema = new mongoose.Schema({
  componentName: { type: String, required: true },
  platform: { type: String, enum: ['render', 'vercel'], required: true },
  resourceType: { type: String, enum: ['render_service', 'vercel_project'], required: true },
  resourceName: { type: String, default: null },
  platformResourceId: { type: String, required: true },
  latestDeployId: { type: String, default: null },
  dashboardUrl: { type: String, default: null },
  liveUrl: { type: String, default: null }
}, { _id: false });

const finalLinkSchema = new mongoose.Schema({
  label: { type: String, required: true },
  url: { type: String, required: true }
}, { _id: false });

const deploymentSchema = new mongoose.Schema({
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
    default: null
  },
  architectureOptionId: {
    type: String,
    required: true
  },
  architectureSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  plan: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  status: {
    type: String,
    enum: ['running', 'succeeded', 'failed', 'stopping', 'stopped'],
    default: 'running'
  },
  steps: {
    type: [stepSchema],
    default: []
  },
  resources: {
    type: [resourceSchema],
    default: []
  },
  finalLinks: {
    type: [finalLinkSchema],
    default: []
  },
  error: {
    type: String,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

deploymentSchema.index({ userId: 1, repoUrl: 1, createdAt: -1 });

module.exports = mongoose.model('Deployment', deploymentSchema);
