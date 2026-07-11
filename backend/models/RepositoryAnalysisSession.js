const mongoose = require('mongoose');

const TEMP_TTL_SECONDS = Number(process.env.TEMP_SESSION_TTL_SECONDS || 1800); // 30 minutes

const repositoryAnalysisSessionSchema = new mongoose.Schema({
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
  result: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  envVars: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: TEMP_TTL_SECONDS,
  },
});

repositoryAnalysisSessionSchema.index({ userId: 1, normalizedUrl: 1 });

module.exports = mongoose.model('RepositoryAnalysisSession', repositoryAnalysisSessionSchema);
