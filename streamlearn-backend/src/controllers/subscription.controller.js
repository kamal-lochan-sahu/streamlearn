const Subscription = require('../models/Subscription');
const Plan         = require('../models/Plan');
const User         = require('../models/User');
const Transaction  = require('../models/Transaction');
const { ApiError }    = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler }= require('../utils/asyncHandler');

exports.getMy = asyncHandler(async (req, res) => {
  const sub = await Subscription.findOne({ userId: req.user._id, status: 'active' })
    .populate('planId');
  res.json(new ApiResponse(200, sub || null));
});

exports.subscribe = asyncHandler(async (req, res) => {
  const { planId, billingCycle = 'monthly', transactionId } = req.body;
  if (!planId) throw new ApiError(400, 'planId required');
  const plan = await Plan.findById(planId);
  if (!plan) throw new ApiError(404, 'Plan not found');

  // Cancel existing
  await Subscription.updateMany({ userId: req.user._id, status: 'active' }, { status: 'cancelled' });

  const now   = new Date();
  const end   = new Date(now);
  if (billingCycle === 'monthly')  end.setMonth(end.getMonth() + 1);
  if (billingCycle === 'yearly')   end.setFullYear(end.getFullYear() + 1);
  if (billingCycle === 'lifetime') end.setFullYear(end.getFullYear() + 99);

  const sub = await Subscription.create({
    userId: req.user._id, planId, billingCycle,
    status: 'active', startDate: now, endDate: end,
    transactionId
  });

  await User.findByIdAndUpdate(req.user._id, {
    subscription: { planId, status: 'active', startDate: now, endDate: end, autoRenew: true }
  });

  res.json(new ApiResponse(201, sub, 'Subscription activated'));
});

exports.cancel = asyncHandler(async (req, res) => {
  const sub = await Subscription.findOneAndUpdate(
    { userId: req.user._id, status: 'active' },
    { status: 'cancelled', cancelledAt: new Date(), cancelReason: req.body.reason || '' },
    { new: true }
  );
  if (!sub) throw new ApiError(404, 'No active subscription');
  await User.findByIdAndUpdate(req.user._id, { 'subscription.status': 'cancelled' });
  res.json(new ApiResponse(200, sub, 'Subscription cancelled'));
});

exports.pause = asyncHandler(async (req, res) => {
  const sub = await Subscription.findOneAndUpdate(
    { userId: req.user._id, status: 'active' },
    { status: 'paused', pausedAt: new Date() }, { new: true }
  );
  if (!sub) throw new ApiError(404, 'No active subscription');
  await User.findByIdAndUpdate(req.user._id, { 'subscription.status': 'paused' });
  res.json(new ApiResponse(200, sub, 'Subscription paused'));
});

exports.resume = asyncHandler(async (req, res) => {
  const sub = await Subscription.findOneAndUpdate(
    { userId: req.user._id, status: 'paused' },
    { status: 'active', pausedAt: null }, { new: true }
  );
  if (!sub) throw new ApiError(404, 'No paused subscription');
  await User.findByIdAndUpdate(req.user._id, { 'subscription.status': 'active' });
  res.json(new ApiResponse(200, sub, 'Subscription resumed'));
});

exports.getOne = asyncHandler(async (req, res) => {
  const sub = await Subscription.findById(req.params.id).populate('planId userId');
  if (!sub) throw new ApiError(404, 'Not found');
  res.json(new ApiResponse(200, sub));
});

exports.getAll = asyncHandler(async (req, res) => {
  const { page=1, limit=20, status } = req.query;
  const query = status ? { status } : {};
  const subs = await Subscription.find(query)
    .populate('planId', 'name').populate('userId', 'name email')
    .sort('-createdAt').skip((page-1)*limit).limit(parseInt(limit));
  res.json(new ApiResponse(200, subs));
});

exports.create = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
exports.update = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
exports.remove = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
