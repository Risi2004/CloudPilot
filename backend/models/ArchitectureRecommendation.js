const mongoose = require('mongoose');

const architectureRecommendationSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['completed', 'failed'],
    default: 'completed'
  },
  result: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, { timestamps: true });

architectureRecommendationSchema.index({ userId: 1, repoUrl: 1 }, { unique: true });

module.exports = mongoose.model('ArchitectureRecommendation', architectureRecommendationSchema);
