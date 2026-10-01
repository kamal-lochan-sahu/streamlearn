const Doubt = require('../models/Doubt');
const { ApiError }    = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler }= require('../utils/asyncHandler');

exports.getByLecture = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;
  const doubts = await Doubt.find({ lectureId })
    .populate('userId', 'name avatar')
    .populate('answers.userId', 'name avatar role')
    .sort('-createdAt');
  res.json(new ApiResponse(200, doubts));
});

exports.create = asyncHandler(async (req, res) => {
  const { contentId, lectureId, question, timestamp } = req.body;
  if (!contentId || !question) throw new ApiError(400, 'contentId and question required');
  const doubt = await Doubt.create({ contentId, lectureId, userId: req.user._id, question, timestamp });
  await doubt.populate('userId', 'name avatar');
  res.json(new ApiResponse(201, doubt, 'Doubt posted'));
});

exports.answer = asyncHandler(async (req, res) => {
  const { answer } = req.body;
  if (!answer) throw new ApiError(400, 'Answer required');
  const doubt = await Doubt.findByIdAndUpdate(req.params.id,
    { $push: { answers: { userId: req.user._id, answer, isInstructor: ['owner','admin','creator'].includes(req.user.role) } } },
    { new: true }
  ).populate('answers.userId', 'name avatar role');
  if (!doubt) throw new ApiError(404, 'Doubt not found');
  res.json(new ApiResponse(200, doubt, 'Answer added'));
});

exports.resolve = asyncHandler(async (req, res) => {
  const doubt = await Doubt.findByIdAndUpdate(req.params.id, { isResolved: true }, { new: true });
  if (!doubt) throw new ApiError(404, 'Doubt not found');
  res.json(new ApiResponse(200, doubt, 'Marked resolved'));
});

exports.getAll  = exports.getByLecture;
exports.getOne  = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
exports.update  = exports.resolve;
exports.remove  = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
