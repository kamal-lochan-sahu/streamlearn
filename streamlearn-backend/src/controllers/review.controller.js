const Review = require('../models/Review');
const Content = require('../models/Content');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

exports.create = asyncHandler(async (req, res) => {
  const { contentId, rating, title, body } = req.body;
  if (!contentId || !rating) throw new ApiError(400, 'contentId and rating required');
  const existing = await Review.findOne({ contentId, userId: req.user._id });
  if (existing) throw new ApiError(409, 'Already reviewed');
  const review = await Review.create({ contentId, userId: req.user._id, rating, title, body });

  // Update content rating
  const stats = await Review.aggregate([
    { $match: { contentId: review.contentId, isActive: true } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  if (stats.length) {
    await Content.findByIdAndUpdate(contentId, {
      'rating.average': Math.round(stats[0].avg * 10) / 10,
      'rating.count': stats[0].count,
    });
  }
  await review.populate('userId', 'name avatar');
  res.json(new ApiResponse(201, review, 'Review added'));
});

exports.getByContent = asyncHandler(async (req, res) => {
  const { contentId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const reviews = await Review.find({ contentId, isActive: true })
    .populate('userId', 'name avatar')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
  const total = await Review.countDocuments({ contentId, isActive: true });
  res.json(new ApiResponse(200, { reviews, total }));
});

exports.update = asyncHandler(async (req, res) => {
  const review = await Review.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: req.body },
    { new: true }
  );
  if (!review) throw new ApiError(404, 'Review not found');
  res.json(new ApiResponse(200, review, 'Updated'));
});

exports.remove = asyncHandler(async (req, res) => {
  await Review.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { isActive: false });
  res.json(new ApiResponse(200, {}, 'Deleted'));
});

exports.markHelpful = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new ApiError(404, 'Review not found');
  const alreadyMarked = review.helpful.users.includes(req.user._id);
  if (alreadyMarked) {
    review.helpful.users.pull(req.user._id);
    review.helpful.count = Math.max(0, review.helpful.count - 1);
  } else {
    review.helpful.users.push(req.user._id);
    review.helpful.count += 1;
  }
  await review.save();
  res.json(new ApiResponse(200, { helpful: review.helpful.count, marked: !alreadyMarked }));
});

exports.getAll = exports.getByContent;
exports.getOne = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
