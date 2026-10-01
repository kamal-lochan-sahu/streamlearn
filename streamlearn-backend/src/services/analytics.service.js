const User        = require('../models/User');
const Content     = require('../models/Content');
const Transaction = require('../models/Transaction');
const Subscription= require('../models/Subscription');

const getDashboardStats = async () => {
  const [totalUsers, activeSubscriptions, totalContent, revenue] = await Promise.all([
    User.countDocuments({ role: 'viewer', isActive: true }),
    Subscription.countDocuments({ status: 'active' }),
    Content.countDocuments({ isActive: true }),
    Transaction.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  return {
    totalUsers,
    activeSubscriptions,
    totalContent,
    totalRevenue: revenue[0]?.total || 0,
  };
};

module.exports = { getDashboardStats };
