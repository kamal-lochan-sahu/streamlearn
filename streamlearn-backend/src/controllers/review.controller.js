const mongoose = require('mongoose');
const Review = require('../models/Review');
const Content = require('../models/Content');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { requireObjectId, optionalInt, optionalString } = require('../utils/validate.utils');
const { pageParams } = require('../utils/query.utils');

/** Reads and validates rating/title/body. With `partial`, missing fields are simply left out. */
const parseReviewInput = (body, { partial }) => {
  const input = body || {};
  const out = {};
  const rating = optionalInt(input.rating, 'rating', 1, 5);
  if (rating === undefined && !partial) throw new ApiError(400, 'rating (1 to 5) required');
  if (rating !== undefined) out.rating = rating;
  if (input.title !== undefined) out.title = optionalString(input.title, 'Title', 100) || '';
  if (input.body !== undefined) out.body = optionalString(input.body, 'Review text', 2000) || '';
  if (partial && !Object.keys(out).length) throw new ApiError(400, 'Nothing to update');
  return out;
};

/** Recomputes the average and count on the content from its active reviews. */
const refreshContentRating = async (contentId) => {
  const filter = { contentId: new mongoose.Types.ObjectId(String(contentId)), isActive: true };
  const count = await Review.countDocuments(filter);
  let average = 0;
  if (count) {
    const [sum] = await Review.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$rating' } } },
    ]);
    average = Math.round((sum.total / count) * 10) / 10;
  }
  await Content.findByIdAndUpdate(contentId, { 'rating.average': average, 'rating.count': count });
};

exports.create = asyncHandler(async (req, res) => {
  const contentId = requireObjectId(req.body?.contentId, 'contentId');
  const fields = parseReviewInput(req.body, { partial: false });
  const content = await Content.findOne({ _id: contentId, isActive: true }).select('_id');
  if (!content) throw new ApiError(404, 'Content not found');

  // Only whitelisted fields are stored: helpful, isVerified, isActive, userId come from the server.
  let review = await Review.findOne({ contentId, userId: req.user._id });
  if (review && review.isActive) throw new ApiError(409, 'Already reviewed');
  if (review) {
    // The user deleted an earlier review: bring it back with the new text
    Object.assign(review, fields, { isActive: true });
    await review.save();
  } else {
    review = await Review.create({ contentId, userId: req.user._id, ...fields });
  }

  await refreshContentRating(contentId);
  await review.populate('userId', 'name avatar');
  res.status(201).json(new ApiResponse(201, review, 'Review added'));
});

exports.getByContent = asyncHandler(async (req, res) => {
  const contentId = requireObjectId(req.params.contentId, 'contentId');
  const { page, limit, skip } = pageParams(req.query, { defaultLimit: 10, maxLimit: 50 });
  const filter = { contentId, isActive: true };
  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate('userId', 'name avatar')
      .select('-helpful.users')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit),
    Review.countDocuments(filter),
  ]);
  res.json(new ApiResponse(200, { reviews, total, page, pages: Math.ceil(total / limit) }));
});

exports.update = asyncHandler(async (req, res) => {
  const id = requireObjectId(req.params.id, 'review id');
  const fields = parseReviewInput(req.body, { partial: true });
  const review = await Review.findOneAndUpdate(
    { _id: id, userId: req.user._id, isActive: true },
    { $set: fields },
    { new: true, runValidators: true }
  );
  if (!review) throw new ApiError(404, 'Review not found');
  if (fields.rating !== undefined) await refreshContentRating(review.contentId);
  res.json(new ApiResponse(200, review, 'Updated'));
});

exports.remove = asyncHandler(async (req, res) => {
  const id = requireObjectId(req.params.id, 'review id');
  const review = await Review.findOneAndUpdate(
    { _id: id, userId: req.user._id, isActive: true },
    { $set: { isActive: false } }
  );
  if (!review) throw new ApiError(404, 'Review not found');
  await refreshContentRating(review.contentId);
  res.json(new ApiResponse(200, {}, 'Deleted'));
});

// Toggle "helpful". Each step is one atomic update, so two quick clicks cannot double count.
exports.markHelpful = asyncHandler(async (req, res) => {
  const id = requireObjectId(req.params.id, 'review id');
  const userId = req.user._id;

  const added = await Review.findOneAndUpdate(
    { _id: id, isActive: true, $nor: [{ 'helpful.users': userId }] },
    { $push: { 'helpful.users': userId }, $inc: { 'helpful.count': 1 } },
    { new: true }
  );
  if (added) return res.json(new ApiResponse(200, { helpful: added.helpful.count, marked: true }));

  const removed = await Review.findOneAndUpdate(
    { _id: id, isActive: true, 'helpful.users': userId },
    { $pull: { 'helpful.users': userId }, $inc: { 'helpful.count': -1 } },
    { new: true }
  );
  if (!removed) throw new ApiError(404, 'Review not found');
  res.json(new ApiResponse(200, { helpful: Math.max(0, removed.helpful.count), marked: false }));
});
