const mongoose = require('mongoose');

const TEMP_TTL_SECONDS = Number(process.env.TEMP_SESSION_TTL_SECONDS || 1800); // 30 minutes

const interviewAnswerSchema = new mongoose.Schema(
  {
    question_id: { type: String, required: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
  },
  { _id: false },
);

const platformSelectionSessionSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['interview', 'complete'],
    default: 'interview',
  },
  interviewAnswers: {
    type: [interviewAnswerSchema],
    default: [],
  },
  lastStepResult: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  recommendation: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: TEMP_TTL_SECONDS,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

platformSelectionSessionSchema.index({ userId: 1, normalizedUrl: 1 });
platformSelectionSessionSchema.index({ userId: 1, analysisSessionId: 1 });

module.exports = mongoose.model('PlatformSelectionSession', platformSelectionSessionSchema);
