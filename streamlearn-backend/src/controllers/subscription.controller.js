const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

// NOTE: there is intentionally no "subscribe" endpoint. Subscriptions are only
// created by payment fulfillment (see services/subscription.service.js).

exports.getMy = asyncHandler(async (req, res) => {
  const sub = await Subscription.findOne({ userId: req.user._id, status: 'active' }).populate(
    'planId'
  );
  res.json(new ApiResponse(200, sub || null));
});

exports.cancel = asyncHandler(async (req, res) => {
  const reason = typeof req.body.reason === 'string' ? req.body.reason.slice(0, 500) : '';
  const sub = await Subscription.findOneAndUpdate(
    { userId: req.user._id, status: 'active' },
    { status: 'cancelled', cancelledAt: new Date(), cancelReason: reason },
    { new: true }
  );
  if (!sub) throw new ApiError(404, 'No active subscription');
  await User.findByIdAndUpdate(req.user._id, { 'subscription.status': 'cancelled' });
  res.json(new ApiResponse(200, sub, 'Subscription cancelled'));
});

exports.pause = asyncHandler(async (req, res) => {
  const sub = await Subscription.findOneAndUpdate(
    { userId: req.user._id, status: 'active' },
    { status: 'paused', pausedAt: new Date() },
    { new: true }
  );
  if (!sub) throw new ApiError(404, 'No active subscription');
  await User.findByIdAndUpdate(req.user._id, { 'subscription.status': 'paused' });
  res.json(new ApiResponse(200, sub, 'Subscription paused'));
});

exports.resume = asyncHandler(async (req, res) => {
  const sub = await Subscription.findOneAndUpdate(
    { userId: req.user._id, status: 'paused' },
    { status: 'active', pausedAt: null },
    { new: true }
  );
  if (!sub) throw new ApiError(404, 'No paused subscription');
  await User.findByIdAndUpdate(req.user._id, { 'subscription.status': 'active' });
  res.json(new ApiResponse(200, sub, 'Subscription resumed'));
});

exports.getAll = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const query = typeof req.query.status === 'string' ? { status: req.query.status } : {};
  const subs = await Subscription.find(query)
    .populate('planId', 'name')
    .populate('userId', 'name email')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(limit);
  res.json(new ApiResponse(200, subs));
});
