const Promotion = require('../models/Promotion');

// Create a new promotion campaign
const createPromotion = async (req, res, next) => {
  try {
    const { code, discountType, value, expiry, targetPlanId } = req.body;

    if (!code || value === undefined) {
      return res.status(400).json({ message: 'Promo Code and Discount Value are required.' });
    }

    const existing = await Promotion.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ message: 'A promotion with this code already exists.' });
    }

    const promotion = new Promotion({
      code: code.toUpperCase().trim(),
      discountType: discountType || 'percentage',
      value: Number(value),
      expiry: expiry ? new Date(expiry) : null,
      targetPlanId: targetPlanId && targetPlanId !== 'all' ? targetPlanId : null
    });

    await promotion.save();
    res.status(201).json({ message: 'Promotion campaign launched successfully.', promotion });
  } catch (err) {
    next(err);
  }
};

// Retrieve all promotions
const getPromotions = async (req, res, next) => {
  try {
    const promotions = await Promotion.find({}).populate('targetPlanId').sort({ createdAt: -1 });
    res.status(200).json(promotions);
  } catch (err) {
    next(err);
  }
};

// Verify an active promo code
const verifyPromotion = async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ message: 'Promo code is required.' });
    }

    const promotion = await Promotion.findOne({ 
      code: code.toUpperCase().trim(),
      isActive: true
    });

    if (!promotion) {
      return res.status(404).json({ message: 'Invalid or inactive promotional code.' });
    }

    // Check expiry
    if (promotion.expiry && new Date(promotion.expiry) < new Date()) {
      return res.status(400).json({ message: 'This promotional code has expired.' });
    }

    res.status(200).json({
      valid: true,
      code: promotion.code,
      discountType: promotion.discountType,
      value: promotion.value,
      targetPlanId: promotion.targetPlanId
    });
  } catch (err) {
    next(err);
  }
};

// Update an existing promotion campaign (Admin only)
const updatePromotion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { code, discountType, value, expiry, targetPlanId, isActive } = req.body;

    const promotion = await Promotion.findById(id);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found.' });
    }

    if (code !== undefined) {
      const existing = await Promotion.findOne({ code: code.toUpperCase().trim(), _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({ message: 'A promotion with this code already exists.' });
      }
      promotion.code = code.toUpperCase().trim();
    }

    if (discountType !== undefined) promotion.discountType = discountType;
    if (value !== undefined) promotion.value = Number(value);
    if (expiry !== undefined) promotion.expiry = expiry ? new Date(expiry) : null;
    if (targetPlanId !== undefined) promotion.targetPlanId = targetPlanId && targetPlanId !== 'all' ? targetPlanId : null;
    if (isActive !== undefined) promotion.isActive = !!isActive;

    await promotion.save();
    res.status(200).json({ message: 'Promotion updated successfully.', promotion });
  } catch (err) {
    next(err);
  }
};

// Delete a promotion campaign (Admin only)
const deletePromotion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const promotion = await Promotion.findById(id);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found.' });
    }

    await Promotion.deleteOne({ _id: id });
    res.status(200).json({ message: 'Promotion deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createPromotion,
  getPromotions,
  verifyPromotion,
  updatePromotion,
  deletePromotion
};
