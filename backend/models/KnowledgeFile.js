const mongoose = require('mongoose');

const knowledgeFileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  dataSourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DataSource',
    required: true,
  },
  sourceName: {
    type: String,
    required: true,
  },
  fileKey: {
    type: String,
    required: true,
  },
  size: {
    type: String,
    required: true,
  },
  fileType: {
    type: String,
    enum: ['pdf', 'doc', 'code'],
    required: true,
  },
  status: {
    type: String,
    enum: ['Ready', 'Indexing', 'Failed'],
    default: 'Ready',
  },
  contentHash: {
    type: String,
    default: null,
  },
  documentId: {
    type: String,
    default: null,
  },
  platform: {
    type: String,
    default: null,
  },
  category: {
    type: String,
    default: null,
  },
  relativePath: {
    type: String,
    default: null,
  },
  chunkCount: {
    type: Number,
    default: 0,
  },
  vectorIds: {
    type: [String],
    default: [],
  },
  embeddingStatus: {
    type: String,
    enum: ['Pending', 'Indexed', 'Failed', 'Stale'],
    default: 'Pending',
  },
  lastSyncedAt: {
    type: Date,
    default: null,
  },
  syncError: {
    type: String,
    default: null,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('KnowledgeFile', knowledgeFileSchema);
