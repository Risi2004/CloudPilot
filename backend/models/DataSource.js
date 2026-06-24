const mongoose = require('mongoose');

const dataSourceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  key: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  folderKey: {
    type: String,
    required: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DataSource',
    default: null
  },
  status: {
    type: String,
    enum: ['Synced', 'Needs Update'],
    default: 'Synced'
  },
  sub: {
    type: String,
    default: 'Repository Index'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure uniqueness of folders under the same parent directory
dataSourceSchema.index({ key: 1, parentId: 1 }, { unique: true });

module.exports = mongoose.model('DataSource', dataSourceSchema);


