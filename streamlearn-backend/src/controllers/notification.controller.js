const Notification = require('../models/Notification');
const User = require('../models/User');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

exports.getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const notifs = await Notification.find({ userId: req.user._id })
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
  const unread = await Notification.countDocuments({ userId: req.user._id, isRead: false });
  res.json(new ApiResponse(200, { notifications: notifs, unread }));
});

exports.markRead = asyncHandler(async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
  res.json(new ApiResponse(200, {}, 'Marked as read'));
});

exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
  res.json(new ApiResponse(200, {}, 'All marked as read'));
});

exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ userId: req.user._id, isRead: false });
  res.json(new ApiResponse(200, { count }));
});

exports.sendAdmin = asyncHandler(async (req, res) => {
  const { userIds, title, message, type = 'system', channel = 'inapp' } = req.body;
  let targetIds = userIds;
  if (!targetIds || targetIds === 'all') {
    const users = await User.find({ role: 'viewer', isActive: true }).select('_id');
    targetIds = users.map((u) => u._id);
  }
  const docs = targetIds.map((userId) => ({ userId, title, message, type, channel }));
  await Notification.insertMany(docs);
  res.json(new ApiResponse(200, { sent: docs.length }, 'Notifications sent'));
});

exports.getOne = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
exports.create = exports.sendAdmin;
exports.update = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
exports.remove = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
