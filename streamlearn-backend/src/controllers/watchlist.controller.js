const Watchlist = require('../models/Watchlist');
const Content = require('../models/Content');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

const getUserWatchlist = async (userId, profileIndex) =>
  Watchlist.findOne({ userId, profileIndex }) ||
  Watchlist.create({ userId, profileIndex, items: [] });

exports.get = asyncHandler(async (req, res) => {
  const profileIndex = req.user.activeProfile || 0;
  let wl = await Watchlist.findOne({ userId: req.user._id, profileIndex });
  if (!wl) return res.json(new ApiResponse(200, []));
  const contentIds = wl.items.map((i) => i.contentId);
  const contents = await Content.find({ _id: { $in: contentIds }, isActive: true }).select(
    'title slug thumbnail type genre duration rating'
  );
  const ordered = wl.items
    .map((item) => ({
      ...contents.find((c) => c._id.toString() === item.contentId.toString())?.toObject(),
      addedAt: item.addedAt,
    }))
    .filter(Boolean);
  res.json(new ApiResponse(200, ordered));
});

exports.add = asyncHandler(async (req, res) => {
  const { contentId } = req.params;
  const profileIndex = req.user.activeProfile || 0;
  const content = await Content.findById(contentId);
  if (!content) throw new ApiError(404, 'Content not found');

  let wl = await Watchlist.findOne({ userId: req.user._id, profileIndex });
  if (!wl) wl = await Watchlist.create({ userId: req.user._id, profileIndex, items: [] });

  const exists = wl.items.some((i) => i.contentId.toString() === contentId);
  if (exists) return res.json(new ApiResponse(200, {}, 'Already in watchlist'));

  wl.items.unshift({ contentId, addedAt: new Date() });
  await wl.save();
  res.json(new ApiResponse(200, {}, 'Added to watchlist'));
});

exports.remove = asyncHandler(async (req, res) => {
  const { contentId } = req.params;
  const profileIndex = req.user.activeProfile || 0;
  await Watchlist.findOneAndUpdate(
    { userId: req.user._id, profileIndex },
    { $pull: { items: { contentId } } }
  );
  res.json(new ApiResponse(200, {}, 'Removed from watchlist'));
});

exports.check = asyncHandler(async (req, res) => {
  const { contentId } = req.params;
  const profileIndex = req.user.activeProfile || 0;
  const wl = await Watchlist.findOne({ userId: req.user._id, profileIndex });
  const inList = wl?.items.some((i) => i.contentId.toString() === contentId) || false;
  res.json(new ApiResponse(200, { inWatchlist: inList }));
});

exports.getAll = exports.get;
exports.create = exports.add;
exports.update = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
