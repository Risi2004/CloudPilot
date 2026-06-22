const mongoose = require('mongoose');

const knowledgeFileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  dataSourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DataSource',
    required: true
  },
  sourceName: {
    type: String,
    required: true
  },
  fileKey: {
    type: String,
    required: true
  },
  size: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    enum: ['pdf', 'doc', 'code'],
    required: true
  },
  status: {
    type: String,
    enum: ['Ready', 'Indexing', 'Failed'],
    default: 'Ready'
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('KnowledgeFile', knowledgeFileSchema);
