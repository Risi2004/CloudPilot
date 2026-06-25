const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  plan: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['COMPLETED', 'PENDING', 'FAILED'],
    default: 'COMPLETED'
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'annually', 'none'],
    default: 'none'
  },
  autoRenew: {
    type: Boolean,
    default: true
  },
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);
