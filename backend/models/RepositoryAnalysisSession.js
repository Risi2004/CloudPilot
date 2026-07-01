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
  createdAt: {
    type: Date,
    default: Date.now,
    expires: TEMP_TTL_SECONDS,
  },
});

repositoryAnalysisSessionSchema.index({ userId: 1, normalizedUrl: 1 });

module.exports = mongoose.model('RepositoryAnalysisSession', repositoryAnalysisSessionSchema);
