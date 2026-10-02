const Coupon = require('../models/Coupon');
const { ApiError } = require('../utils/ApiError');

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Pure math: discount for a given coupon on a given amount (rupees).
 * Never returns more than the amount itself.
 */
const computeDiscount = (coupon, amount) => {
  let discount = 0;
  if (coupon.type === 'percent') discount = amount * (coupon.value / 100);
  if (coupon.type === 'fixed') discount = coupon.value;
  if (coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(Math.max(discount, 0), amount);
  return round2(discount);
};

/**
 * Validates a coupon for a user + plan + amount. Throws ApiError if unusable.
 * Returns { coupon, discount, finalAmount }.
 */
const evaluateCoupon = async ({ code, userId, planId, amount }) => {
  if (typeof code !== 'string' || !code.trim()) throw new ApiError(400, 'Coupon code required');

  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase(), isActive: true });
  if (!coupon) throw new ApiError(404, 'Invalid coupon code');

  const now = new Date();
  if (coupon.startDate && now < coupon.startDate) throw new ApiError(400, 'Coupon not active yet');
  if (coupon.endDate && now > coupon.endDate) throw new ApiError(400, 'Coupon expired');
  if (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit)
    throw new ApiError(400, 'Coupon usage limit reached');

  if (coupon.type === 'free_trial')
    throw new ApiError(400, 'This coupon type is not supported yet');

  if (coupon.applicableFor === 'content')
    throw new ApiError(400, 'Coupon is not valid for subscriptions');
  if (coupon.applicableFor === 'plan') {
    const ok = (coupon.planIds || []).some((id) => String(id) === String(planId));
    if (!ok) throw new ApiError(400, 'Coupon is not valid for this plan');
  }

  const userUses = (coupon.usedBy || []).filter((u) => String(u.userId) === String(userId)).length;
  if (userUses >= (coupon.perUserLimit || 1))
    throw new ApiError(400, 'Coupon already used maximum times');

  const discount = computeDiscount(coupon, amount);
  return { coupon, discount, finalAmount: round2(amount - discount) };
};

/**
 * Atomically records one redemption. Respects the global usage limit even under
 * concurrent payments. Returns true if recorded, false if the limit was already hit.
 */
const redeemCoupon = async (code, userId) => {
  const updated = await Coupon.findOneAndUpdate(
    {
      code: String(code).toUpperCase(),
      $or: [{ usageLimit: 0 }, { $expr: { $lt: ['$usageCount', '$usageLimit'] } }],
    },
    { $inc: { usageCount: 1 }, $push: { usedBy: { userId, usedAt: new Date() } } },
    { new: true }
  );
  return Boolean(updated);
};

module.exports = { computeDiscount, evaluateCoupon, redeemCoupon, round2 };
