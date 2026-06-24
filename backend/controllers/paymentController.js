const crypto = require('crypto');
const User = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Promotion = require('../models/Promotion');
const { sendPaymentReceiptEmail } = require('../utils/mailer');

const md5 = (string) => {
  return crypto.createHash('md5').update(string).digest('hex');
};

// Initiate payment checkout session (Admin/User)
const initiatePayment = async (req, res, next) => {
  try {
    const { planId, promoCode } = req.body;
    const userId = req.user._id;

    if (!planId) {
      return res.status(400).json({ message: 'Plan identifier is required.' });
    }

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Subscription plan not found.' });
    }

    let finalPrice = plan.price;
    let appliedPromo = null;

    // Apply promo code if provided
    if (promoCode) {
      const promotion = await Promotion.findOne({ code: promoCode.toUpperCase(), isActive: true });
      if (promotion) {
        const isExpired = new Date(promotion.expiry) < new Date();
        const isApplicable = !promotion.targetPlanId || 
                              promotion.targetPlanId === 'all' || 
                              promotion.targetPlanId.toString() === planId;

        if (!isExpired && isApplicable && finalPrice > 0) {
          appliedPromo = promotion.code;
          if (promotion.discountType === 'percentage') {
            finalPrice = Math.max(0, finalPrice - (finalPrice * promotion.value / 100));
          } else if (promotion.discountType === 'fixed') {
            finalPrice = Math.max(0, finalPrice - promotion.value);
          }
        }
      }
    }

    const merchantId = process.env.PAYHERE_MERCHANT_ID || '1226840';
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || 'MTE0MjMxNDgxMzM4NDU3MDM5MjMxNDIwNDA4MTQwMTcx';
    
    // Generate order ID: ORDER_[userID]_[timestamp]
    const orderId = `ORDER_${userId}_${Date.now()}`;
    const formattedAmount = finalPrice.toFixed(2);
    const currency = 'USD'; // Using USD or LKR

    // Generate MD5 checksum signature required by PayHere
    const hashedSecret = md5(merchantSecret).toUpperCase();
    const rawString = merchantId + orderId + formattedAmount + currency + hashedSecret;
    const hash = md5(rawString).toUpperCase();

    // Prepare customer details
    const fullNameParts = req.user.fullName.trim().split(/\s+/);
    const firstName = fullNameParts[0] || 'Operator';
    const lastName = fullNameParts.slice(1).join(' ') || 'User';

    res.status(200).json({
      sandbox: true, // Set to true for PayHere sandbox environment
      merchant_id: merchantId,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?payment=success`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/upgrade?payment=cancelled`,
      notify_url: `${process.env.BACKEND_API_URL || 'http://localhost:5000'}/api/payments/notify`,
      order_id: orderId,
      items: `${plan.name} Subscription`,
      amount: formattedAmount,
      currency: currency,
      hash: hash,
      first_name: firstName,
      last_name: lastName,
      email: req.user.email,
      phone: '0771234567', // Dummy defaults required by PayHere
      address: '123 CloudPilot Ave',
      city: 'Colombo',
      country: 'Sri Lanka',
      custom_1: userId.toString(),
      custom_2: plan.name // Store plan name to update in webhook
    });
  } catch (err) {
    next(err);
  }
};

// Webhook / IPN Receiver from PayHere servers
const payhereNotify = async (req, res, next) => {
  try {
    const {
      merchant_id,
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      custom_1: userId,
      custom_2: planName
    } = req.body;

    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || 'MTE0MjMxNDgxMzM4NDU3MDM5MjMxNDIwNDA4MTQwMTcx';

    // Verify MD5 Signature to ensure request originates from PayHere
    const hashedSecret = md5(merchantSecret).toUpperCase();
    const rawString = merchant_id + order_id + payhere_amount + payhere_currency + status_code + hashedSecret;
    const localSig = md5(rawString).toUpperCase();

    if (localSig !== md5sig) {
      console.warn(`[PayHere Webhook] Invalid signature match from order: ${order_id}`);
      return res.status(400).json({ message: 'Signature verification failed.' });
    }

    // status_code '2' means payment completed successfully
    if (status_code === '2') {
      const user = await User.findById(userId);
      if (!user) {
        console.error(`[PayHere Webhook] User not found during fulfillment: ${userId}`);
        return res.status(404).json({ message: 'User not found.' });
      }

      // Upgrade user subscription plan in database
      user.plan = planName;
      user.lastActivity = new Date();
      await user.save();

      console.log(`[PayHere Webhook] Subscription upgraded: User ${user.email} -> ${planName} Plan (Order: ${order_id})`);

      // Dispatch digital payment receipt email asynchronously
      sendPaymentReceiptEmail(user.email, user.fullName, planName, payhere_amount, payhere_currency, order_id)
        .catch(e => console.error(`[PayHere Webhook] Error sending receipt email:`, e));
    } else {
      console.log(`[PayHere Webhook] Order ${order_id} update received. Status: ${status_code}`);
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('[PayHere Webhook Error]:', err);
    res.status(500).json({ error: err.message });
  }
};

// Subscribe directly to a Free plan (no payment required)
const subscribeFree = async (req, res, next) => {
  try {
    const { planId } = req.body;
    const userId = req.user._id;

    if (!planId) {
      return res.status(400).json({ message: 'Plan ID is required.' });
    }

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Subscription plan not found.' });
    }

    if (plan.price > 0) {
      return res.status(400).json({ message: 'Selected plan requires payment.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.plan = plan.name;
    user.lastActivity = new Date();
    await user.save();

    res.status(200).json({
      message: `Successfully subscribed to ${plan.name} plan.`,
      user: {
        email: user.email,
        fullName: user.fullName,
        profileImageKey: user.profileImageKey,
        role: user.role,
        plan: user.plan
      }
    });
  } catch (err) {
    next(err);
  }
};

// Confirm payment locally (useful for local development where webhook IPN cannot reach localhost)
const confirmPayment = async (req, res, next) => {
  try {
    const { orderId, planId } = req.body;
    const userId = req.user._id;

    if (!planId) {
      return res.status(400).json({ message: 'Plan ID is required.' });
    }

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Subscription plan not found.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Direct sandbox upgrade (useful for local offline / tunnel-free development testing)
    user.plan = plan.name;
    user.lastActivity = new Date();
    await user.save();

    console.log(`[Local Payment Confirmation] Saved user plan in DB: User ${user.email} -> ${plan.name} (Order: ${orderId})`);

    // Dispatch receipt email
    const formattedAmount = plan.price.toFixed(2);
    sendPaymentReceiptEmail(user.email, user.fullName, plan.name, formattedAmount, 'USD', orderId || 'SANDBOX_TX')
      .catch(e => console.error(`[Local Payment Confirmation] Error sending receipt email:`, e));

    res.status(200).json({
      message: 'Plan successfully upgraded in database.',
      plan: user.plan
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  initiatePayment,
  payhereNotify,
  subscribeFree,
  confirmPayment
};
