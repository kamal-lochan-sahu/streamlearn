const Coupon = require('../models/Coupon');
const Plan = require('../models/Plan');
const { evaluateCoupon } = require('../services/coupon.service');
const { BILLING_CYCLES } = require('../services/subscription.service');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

// Only these fields may be set by an admin. usageCount / usedBy are server-managed.
const EDITABLE_FIELDS = [
  'code',
  'description',
  'type',
  'value',
  'maxDiscount',
  'usageLimit',
  'perUserLimit',
  'applicableFor',
  'planIds',
  'contentIds',
  'startDate',
  'endDate',
  'isActive',
];

const pickEditable = (body) => {
  const data = {};
  for (const key of EDITABLE_FIELDS) if (body[key] !== undefined) data[key] = body[key];
  if (typeof data.code === 'string') data.code = data.code.trim().toUpperCase();
  return data;
};

// POST /validate  { code, planId, billingCycle }  -> discount computed on the server
exports.validate = asyncHandler(async (req, res) => {
  const { code, planId, billingCycle = 'monthly' } = req.body;
  if (!planId) throw new ApiError(400, 'planId required');
  if (!BILLING_CYCLES.includes(billingCycle)) throw new ApiError(400, 'Invalid billing cycle');

  const plan = await Plan.findById(planId);
  if (!plan || !plan.isActive) throw new ApiError(404, 'Plan not found');
  const amount = plan.price?.[billingCycle];
  if (!(amount > 0)) throw new ApiError(400, 'This billing cycle is not available for this plan');

  const { coupon, discount, finalAmount } = await evaluateCoupon({
    code,
    userId: req.user._id,
    planId: plan._id,
    amount,
  });

  res.json(
    new ApiResponse(200, {
      valid: true,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discount,
      finalAmount,
      description: coupon.description,
    })
  );
});

exports.getAll = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort('-createdAt');
  res.json(new ApiResponse(200, coupons));
});

exports.getOne = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw new ApiError(404, 'Not found');
  res.json(new ApiResponse(200, coupon));
});

exports.create = asyncHandler(async (req, res) => {
  const data = pickEditable(req.body);
  if (!data.code) throw new ApiError(400, 'Coupon code required');
  const coupon = await Coupon.create(data);
  res.status(201).json(new ApiResponse(201, coupon, 'Coupon created'));
});

exports.update = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, pickEditable(req.body), {
    new: true,
    runValidators: true,
  });
  if (!coupon) throw new ApiError(404, 'Coupon not found');
  res.json(new ApiResponse(200, coupon, 'Updated'));
});

exports.remove = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw new ApiError(404, 'Coupon not found');
  res.json(new ApiResponse(200, {}, 'Deleted'));
});
