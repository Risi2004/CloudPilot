const mongoose = require('mongoose');

const kbMatchSchema = new mongoose.Schema({
  label: { type: String, default: '' },
  text: { type: String, default: '' }
}, { _id: false });

const envFixSchema = new mongoose.Schema({
  componentName: { type: String, required: true },
  key: { type: String, required: true },
  newValue: { type: String, default: '' },
  reason: { type: String, default: '' }
}, { _id: false });

const codeFixFileRefSchema = new mongoose.Schema({
  path: { type: String, required: true },
  reason: { type: String, default: '' }
}, { _id: false });

const diagnosisSchema = new mongoose.Schema({
  errorSignature: { type: String, default: '' },
  rootCause: { type: String, default: '' },
  explanation: { type: String, default: '' },
  category: { type: String, enum: ['env', 'code', 'infra', 'unknown'], default: 'unknown' },
  confidence: { type: Number, default: 0 },
  envFixes: { type: [envFixSchema], default: [] },
  codeFix: {
    files: { type: [codeFixFileRefSchema], default: [] },
    summary: { type: String, default: '' }
  },
  kbMatches: { type: [kbMatchSchema], default: [] }
}, { _id: false });

const proposedFixFileSchema = new mongoose.Schema({
  path: { type: String, required: true },
  oldContent: { type: String, default: '' },
  newContent: { type: String, default: '' }
}, { _id: false });

const commitRefSchema = new mongoose.Schema({
  sha: { type: String, default: null },
  url: { type: String, default: null }
}, { _id: false });

const redeployOutcomeSchema = new mongoose.Schema({
  ok: { type: Boolean, default: false },
  message: { type: String, default: '' }
}, { _id: false });

const attemptSchema = new mongoose.Schema({
  attemptNumber: { type: Number, required: true },
  diagnosis: { type: diagnosisSchema, default: null },
  userChoice: { type: String, enum: ['auto', 'manual', null], default: null },
  appliedFix: { type: mongoose.Schema.Types.Mixed, default: null },
  commit: { type: commitRefSchema, default: null },
  redeployOutcome: { type: redeployOutcomeSchema, default: null },
  startedAt: { type: Date, default: null },
  finishedAt: { type: Date, default: null }
}, { _id: false });

const deploymentTroubleshootingSchema = new mongoose.Schema({
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
    enum: [
      'diagnosing',
      'awaiting_user_choice',
      'applying_fix',
      'redeploying',
      'succeeded',
      'failed',
      'manual',
      'stopping',
      'stopped'
    ],
    default: 'diagnosing'
  },
  attempt: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  diagnosis: {
    type: diagnosisSchema,
    default: null
  },
  proposedFix: {
    files: { type: [proposedFixFileSchema], default: [] },
    commitMessage: { type: String, default: '' }
  },
  attemptHistory: {
    type: [attemptSchema],
    default: []
  },
  resolution: {
    summary: { type: String, default: '' },
    unresolvedReason: { type: String, default: '' }
  }
}, { timestamps: true });

deploymentTroubleshootingSchema.index({ userId: 1, deploymentId: 1 });

module.exports = mongoose.model('DeploymentTroubleshooting', deploymentTroubleshootingSchema);
