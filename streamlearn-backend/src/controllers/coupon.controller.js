const Coupon = require('../models/Coupon');
const { ApiError }    = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler }= require('../utils/asyncHandler');

exports.validate = asyncHandler(async (req, res) => {
  const { code, planId, amount } = req.body;
  if (!code) throw new ApiError(400, 'Coupon code required');
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
  if (!coupon) throw new ApiError(404, 'Invalid coupon code');
  if (coupon.endDate && new Date() > coupon.endDate) throw new ApiError(400, 'Coupon expired');
  if (coupon.startDate && new Date() < coupon.startDate) throw new ApiError(400, 'Coupon not active yet');
  if (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) throw new ApiError(400, 'Coupon usage limit reached');

  const userUsage = coupon.usedBy.filter(u => u.userId.toString() === req.user._id.toString()).length;
  if (userUsage >= coupon.perUserLimit) throw new ApiError(400, 'Coupon already used maximum times');

  let discount = 0;
  if (amount) {
    if (coupon.type === 'percent') discount = amount * (coupon.value / 100);
    if (coupon.type === 'fixed')   discount = coupon.value;
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  }

  res.json(new ApiResponse(200, {
    valid: true, code: coupon.code, type: coupon.type,
    value: coupon.value, discount: Math.round(discount * 100) / 100,
    description: coupon.description
  }));
});

exports.getAll = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort('-createdAt');
  res.json(new ApiResponse(200, coupons));
});

exports.create = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create({ ...req.body, code: req.body.code.toUpperCase() });
  res.json(new ApiResponse(201, coupon, 'Coupon created'));
});

exports.update = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!coupon) throw new ApiError(404, 'Coupon not found');
  res.json(new ApiResponse(200, coupon, 'Updated'));
});

exports.remove = asyncHandler(async (req, res) => {
  await Coupon.findByIdAndDelete(req.params.id);
  res.json(new ApiResponse(200, {}, 'Deleted'));
});

exports.getOne = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw new ApiError(404, 'Not found');
  res.json(new ApiResponse(200, coupon));
});
