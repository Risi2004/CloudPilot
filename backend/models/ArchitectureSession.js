const mongoose = require('mongoose');

const TEMP_TTL_SECONDS = Number(process.env.TEMP_SESSION_TTL_SECONDS || 1800);

const architectureSessionSchema = new mongoose.Schema({
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
  blueprint: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  componentAnalysis: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  platformsEvaluated: {
    type: [String],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: TEMP_TTL_SECONDS,
  },
});

architectureSessionSchema.index({ userId: 1, platformSelectionSessionId: 1 });

module.exports = mongoose.model('ArchitectureSession', architectureSessionSchema);
