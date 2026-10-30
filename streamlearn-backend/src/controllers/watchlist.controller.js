const mongoose = require('mongoose');
const Watchlist = require('../models/Watchlist');
const Content = require('../models/Content');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { requireObjectId } = require('../utils/validate.utils');
const { publishedFilter } = require('../services/search.service');

const MAX_ITEMS = 500;
const profileOf = (req) => req.user.activeProfile || 0;

// GET /api/watchlist: newest first. Titles that were deleted, unpublished or expired are left out
// (they used to come back as empty objects that only had an addedAt date).
exports.get = asyncHandler(async (req, res) => {
  const wl = await Watchlist.findOne({ userId: req.user._id, profileIndex: profileOf(req) }).lean();
  if (!wl?.items?.length) return res.json(new ApiResponse(200, []));

  const contents = await Content.find({
    _id: { $in: wl.items.map((i) => i.contentId) },
    ...publishedFilter(),
  })
    .select('title slug thumbnail type genre duration rating')
    .lean();
  const byId = new Map(contents.map((c) => [String(c._id), c]));

  const items = wl.items
    .filter((i) => byId.has(String(i.contentId)))
    .map((i) => ({ ...byId.get(String(i.contentId)), addedAt: i.addedAt }))
    .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
  res.json(new ApiResponse(200, items));
});

// POST /api/watchlist/add/:contentId  (adding twice is fine and changes nothing)
exports.add = asyncHandler(async (req, res) => {
  const contentId = new mongoose.Types.ObjectId(requireObjectId(req.params.contentId, 'contentId'));
  const filter = { userId: req.user._id, profileIndex: profileOf(req) };
  const content = await Content.findOne({ _id: contentId, ...publishedFilter() }).select('_id');
  if (!content) throw new ApiError(404, 'Content not found');

  // One list per profile (unique index). The upsert is safe even when two requests race.
  const wl = await Watchlist.findOneAndUpdate(
    filter,
    { $setOnInsert: { items: [] } },
    { upsert: true, new: true }
  );
  if (wl.items.some((i) => String(i.contentId) === String(contentId)))
    return res.json(new ApiResponse(200, {}, 'Already in watchlist'));
  if (wl.items.length >= MAX_ITEMS) throw new ApiError(400, 'Watchlist is full');

  // Atomic: the push only happens while the title is not in the list yet
  await Watchlist.updateOne(
    { ...filter, $nor: [{ 'items.contentId': contentId }] },
    { $push: { items: { contentId, addedAt: new Date() } } }
  );
  res.json(new ApiResponse(200, {}, 'Added to watchlist'));
});

// DELETE /api/watchlist/remove/:contentId
exports.remove = asyncHandler(async (req, res) => {
  const contentId = requireObjectId(req.params.contentId, 'contentId');
  const wl = await Watchlist.findOne({ userId: req.user._id, profileIndex: profileOf(req) });
  if (wl) {
    wl.items = wl.items.filter((i) => String(i.contentId) !== contentId);
    await wl.save();
  }
  res.json(new ApiResponse(200, {}, 'Removed from watchlist'));
});

// GET /api/watchlist/check/:contentId
exports.check = asyncHandler(async (req, res) => {
  const contentId = requireObjectId(req.params.contentId, 'contentId');
  const wl = await Watchlist.findOne({
    userId: req.user._id,
    profileIndex: profileOf(req),
  }).select('items.contentId');
  const inList = wl?.items.some((i) => String(i.contentId) === contentId) || false;
  res.json(new ApiResponse(200, { inWatchlist: inList }));
});
