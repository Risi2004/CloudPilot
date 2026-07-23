const mongoose = require('mongoose');

// BUG-008 fix: Default TTL raised from 7200 (2h) to 86400 (24h).
// Render deployments can take 20-40 min + multiple poll cycles.  A 2-hour
// window is too short and causes session deletion mid-deployment.  Override
// with DEPLOYMENT_SESSION_TTL_SECONDS in .env for custom tuning.
const DEPLOYMENT_TTL_SECONDS = Number(process.env.DEPLOYMENT_SESSION_TTL_SECONDS || 86400);

const deploymentSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  sourceUrl: {
    type: String,
    required: true,
    trim: true,
  },
  normalizedUrl: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  analysisSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RepositoryAnalysisSession',
    required: true,
  },
  platformSelectionSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PlatformSelectionSession',
    required: true,
  },
  architectureSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ArchitectureSession',
    required: true,
  },
  blueprint: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  repositoryAnalysis: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  branch: {
    type: String,
    default: 'main',
  },
  status: {
    type: String,
    enum: ['preparing', 'needs_input', 'awaiting_confirmation', 'deploying', 'failed', 'complete'],
    default: 'preparing',
  },
  missingInputs: {
    type: mongoose.Schema.Types.Mixed,
    default: [],
  },
  deploymentSummary: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  deploymentState: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  progress: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  report: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  failureAnalysis: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  confirmedAt: {
    type: Date,
    default: null,
  },
  startedAt: {
    type: Date,
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: DEPLOYMENT_TTL_SECONDS,
  },
});

deploymentSessionSchema.index({ userId: 1, architectureSessionId: 1 });

module.exports = mongoose.model('DeploymentSession', deploymentSessionSchema);
