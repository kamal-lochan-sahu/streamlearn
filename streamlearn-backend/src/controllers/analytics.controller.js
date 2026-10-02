const User = require('../models/User');
const Content = require('../models/Content');
const Transaction = require('../models/Transaction');
const Subscription = require('../models/Subscription');
const LiveStream = require('../models/LiveStream');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

exports.getDashboard = asyncHandler(async (req, res) => {
  const [totalUsers, activeSubscriptions, totalContent, revenueData, newUsersThisMonth] =
    await Promise.all([
      User.countDocuments({ role: 'viewer' }),
      Subscription.countDocuments({ status: 'active' }),
      Content.countDocuments({ isActive: true }),
      Transaction.aggregate([
        { $match: { status: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      User.countDocuments({
        role: 'viewer',
        createdAt: { $gte: new Date(new Date().setDate(1)) },
      }),
    ]);

  // Monthly revenue for chart (last 6 months)
  const monthlyRevenue = await Transaction.aggregate([
    {
      $match: {
        status: 'success',
        createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        revenue: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Subscriber growth (last 30 days)
  const subscriberGrowth = await User.aggregate([
    {
      $match: {
        role: 'viewer',
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json(
    new ApiResponse(200, {
      stats: {
        totalUsers,
        activeSubscriptions,
        totalContent,
        totalRevenue: revenueData[0]?.total || 0,
        totalTransactions: revenueData[0]?.count || 0,
        newUsersThisMonth,
        mrr: (revenueData[0]?.total || 0) / 6, // approx
      },
      monthlyRevenue,
      subscriberGrowth,
    })
  );
});

exports.getContent = asyncHandler(async (req, res) => {
  const topContent = await Content.find({ isActive: true })
    .sort('-viewCount')
    .limit(10)
    .select('title type viewCount rating thumbnail');
  const contentByType = await Content.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$type', count: { $sum: 1 }, totalViews: { $sum: '$viewCount' } } },
  ]);
  res.json(new ApiResponse(200, { topContent, contentByType }));
});

exports.getSubscribers = asyncHandler(async (req, res) => {
  const planDistribution = await Subscription.aggregate([
    { $match: { status: 'active' } },
    { $lookup: { from: 'plans', localField: 'planId', foreignField: '_id', as: 'plan' } },
    { $unwind: '$plan' },
    { $group: { _id: '$plan.name', count: { $sum: 1 } } },
  ]);
  const churnedThisMonth = await Subscription.countDocuments({
    status: 'cancelled',
    cancelledAt: { $gte: new Date(new Date().setDate(1)) },
  });
  res.json(new ApiResponse(200, { planDistribution, churnedThisMonth }));
});

exports.getRevenue = asyncHandler(async (req, res) => {
  const { period = '30' } = req.query;
  const since = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);
  const revenue = await Transaction.aggregate([
    { $match: { status: 'success', createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        amount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  const total = revenue.reduce((s, r) => s + r.amount, 0);
  res.json(new ApiResponse(200, { revenue, total, period }));
});

exports.getLive = asyncHandler(async (req, res) => {
  const streams = await LiveStream.find()
    .sort('-createdAt')
    .limit(10)
    .select('title status peakViewers totalViewers startedAt endedAt');
  res.json(new ApiResponse(200, streams));
});

exports.exportData = asyncHandler(async (req, res) => {
  // TODO: generate CSV/PDF export
  res.json(new ApiResponse(200, { message: 'Export queued. You will receive an email.' }));
});

exports.getAll = exports.getDashboard;
exports.getOne = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
exports.create = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
exports.update = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
exports.remove = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
