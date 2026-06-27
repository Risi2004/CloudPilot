const mongoose = require('mongoose');

const syncErrorSchema = new mongoose.Schema(
  {
    fileKey: { type: String, default: null },
    message: { type: String, required: true },
  },
  { _id: false },
);

const knowledgeSyncReportSchema = new mongoose.Schema({
  triggeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  newDocuments: { type: Number, default: 0 },
  updatedDocuments: { type: Number, default: 0 },
  deletedDocuments: { type: Number, default: 0 },
  unchangedDocuments: { type: Number, default: 0 },
  totalChunksCreated: { type: Number, default: 0 },
  totalEmbeddingsGenerated: { type: Number, default: 0 },
  totalVectors: { type: Number, default: 0 },
  processingTimeMs: { type: Number, default: 0 },
  scopeLabel: { type: String, default: 'All folders' },
  folderPrefix: { type: String, default: 'knowledge-base/' },
  errors: { type: [syncErrorSchema], default: [] },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('KnowledgeSyncReport', knowledgeSyncReportSchema);
