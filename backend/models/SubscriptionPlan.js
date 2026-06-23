const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  badge: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true
  },
  features: {
    type: [String],
    default: []
  },
  subscribers: {
    type: Number,
    default: 0
  },
  badgeClass: {
    type: String,
    default: 'community-badge'
  },
  isHighlighted: {
    type: Boolean,
    default: false
  },
  description: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
