const SubscriptionPlan = require('../models/SubscriptionPlan');

// Get all subscription plans
const getSubscriptions = async (req, res, next) => {
  try {
    const plans = await SubscriptionPlan.find({}).sort({ price: 1 });
    res.status(200).json(plans);
  } catch (err) {
    next(err);
  }
};

// Create a new subscription plan (Admin only)
const createSubscription = async (req, res, next) => {
  try {
    const { name, badge, price, features, subscribers, badgeClass, isHighlighted, description } = req.body;
    
    if (!name || price === undefined) {
      return res.status(400).json({ message: 'Plan Name and Price are required.' });
    }

    const plan = new SubscriptionPlan({
      name,
      badge: badge || '',
      price: Number(price),
      features: features || [],
      subscribers: subscribers !== undefined ? Number(subscribers) : 0,
      badgeClass: badgeClass || 'community-badge',
      isHighlighted: !!isHighlighted,
      description: description || ''
    });

    await plan.save();
    res.status(201).json({ message: 'Subscription plan created successfully.', plan });
  } catch (err) {
    next(err);
  }
};

// Update an existing subscription plan (Admin only)
const updateSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, badge, price, features, subscribers, badgeClass, isHighlighted, description } = req.body;

    const plan = await SubscriptionPlan.findById(id);
    if (!plan) {
      return res.status(404).json({ message: 'Subscription plan not found.' });
    }

    if (name !== undefined) plan.name = name;
    if (badge !== undefined) plan.badge = badge;
    if (price !== undefined) plan.price = Number(price);
    if (features !== undefined) plan.features = features;
    if (subscribers !== undefined) plan.subscribers = Number(subscribers);
    if (badgeClass !== undefined) plan.badgeClass = badgeClass;
    if (isHighlighted !== undefined) plan.isHighlighted = !!isHighlighted;
    if (description !== undefined) plan.description = description;

    await plan.save();
    res.status(200).json({ message: 'Subscription plan updated successfully.', plan });
  } catch (err) {
    next(err);
  }
};

// Delete a subscription plan (Admin only)
const deleteSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const plan = await SubscriptionPlan.findById(id);
    if (!plan) {
      return res.status(404).json({ message: 'Subscription plan not found.' });
    }

    await SubscriptionPlan.deleteOne({ _id: id });
    res.status(200).json({ message: 'Subscription plan deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// Seed default plans if collection is empty
const seedSubscriptionPlans = async () => {
  try {
    const count = await SubscriptionPlan.countDocuments({});
    if (count > 0) return;

    console.log('Seeding initial subscription plans...');
    const defaultPlans = [
      {
        name: 'Free',
        badge: 'COMMUNITY',
        price: 0,
        features: [
          'Up to 3 AI Agents',
          '500 Global Requests',
          'Shared Knowledge Base'
        ],
        subscribers: 12482,
        badgeClass: 'community-badge',
        isHighlighted: false,
        description: 'Perfect for testing and personal sandbox environments.'
      },
      {
        name: 'Pro',
        badge: 'POPULAR',
        price: 49,
        features: [
          'Unlimited AI Agents',
          'Priority Execution',
          '10GB Private Knowledge Base',
          'SLA: 99.9% Uptime'
        ],
        subscribers: 4210,
        badgeClass: 'popular-badge',
        isHighlighted: true,
        description: 'Standard plan for production scale multi-agent orchestration.'
      },
      {
        name: 'Enterprise',
        badge: 'CUSTOM',
        price: 299,
        features: [
          'Dedicated Infrastructure',
          'White-label Options',
          'Custom Security Audit'
        ],
        subscribers: 184,
        badgeClass: 'custom-badge',
        isHighlighted: false,
        description: 'Custom scaling rules and secure single-tenant deployments.'
      }
    ];

    await SubscriptionPlan.insertMany(defaultPlans);
    console.log('Seeded initial subscription plans successfully.');
  } catch (err) {
    console.error('Error seeding subscription plans:', err);
  }
};

const cancelSubscription = async (req, res, next) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.plan === 'Free') {
      return res.status(400).json({ message: 'No active paid subscription to cancel.' });
    }

    // Disable autoRenew
    user.autoRenew = false;
    await user.save();

    res.status(200).json({
      message: 'Your subscription renewal has been cancelled. The plan features remain active until the end of your chosen cycle.',
      user: {
        email: user.email,
        fullName: user.fullName,
        plan: user.plan,
        autoRenew: user.autoRenew,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
        billingCycle: user.billingCycle
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  seedSubscriptionPlans,
  cancelSubscription
};
