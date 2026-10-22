const Notification = require('../models/Notification');
const User = require('../models/User');
const {
  isObjectId,
  requireObjectId,
  requireText,
  optionalString,
  clampInt,
} = require('../utils/validate.utils');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

const TYPES = Notification.schema.path('type').enumValues;
const CHANNELS = Notification.schema.path('channel').enumValues;

exports.getAll = asyncHandler(async (req, res) => {
  const page = clampInt(req.query.page, 1, 1, 10000);
  const limit = clampInt(req.query.limit, 20, 1, 100);
  const notifs = await Notification.find({ userId: req.user._id })
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(limit);
  const unread = await Notification.countDocuments({ userId: req.user._id, isRead: false });
  res.json(new ApiResponse(200, { notifications: notifs, unread }));
});

// A user can only mark THEIR OWN notifications as read
exports.markRead = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id, 'notification id');
  const result = await Notification.updateOne(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true }
  );
  if (!result.matchedCount) throw new ApiError(404, 'Notification not found');
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
  const { userIds, type = 'system', channel = 'inapp' } = req.body;
  const title = requireText(req.body.title, 'Title', 200);
  const message = optionalString(req.body.message, 'Message', 2000);
  if (!TYPES.includes(type)) throw new ApiError(400, 'Invalid type');
  if (!CHANNELS.includes(channel)) throw new ApiError(400, 'Invalid channel');

  let targetIds;
  if (userIds === undefined || userIds === 'all') {
    const users = await User.find({ role: 'viewer', isActive: true }).select('_id');
    targetIds = users.map((u) => u._id);
  } else if (Array.isArray(userIds) && userIds.length <= 5000 && userIds.every(isObjectId)) {
    targetIds = userIds;
  } else {
    throw new ApiError(400, 'userIds must be "all" or a list of user ids');
  }
  if (!targetIds.length) return res.json(new ApiResponse(200, { sent: 0 }, 'Nobody to notify'));

  await Notification.insertMany(
    targetIds.map((userId) => ({ userId, title, message, type, channel }))
  );
  res.json(new ApiResponse(200, { sent: targetIds.length }, 'Notifications sent'));
});
