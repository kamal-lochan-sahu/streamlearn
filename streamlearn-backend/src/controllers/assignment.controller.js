const Assignment = require('../models/Assignment');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

exports.getByLecture = asyncHandler(async (req, res) => {
  const assignments = await Assignment.find({ lectureId: req.params.lectureId });
  res.json(new ApiResponse(200, assignments));
});

exports.submit = asyncHandler(async (req, res) => {
  const { content, attachments } = req.body;
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) throw new ApiError(404, 'Assignment not found');
  const existing = assignment.submissions.findIndex(
    (s) => s.userId.toString() === req.user._id.toString()
  );
  if (existing >= 0)
    assignment.submissions[existing] = {
      userId: req.user._id,
      content,
      attachments,
      submittedAt: new Date(),
    };
  else assignment.submissions.push({ userId: req.user._id, content, attachments });
  await assignment.save();
  res.json(new ApiResponse(200, {}, 'Assignment submitted'));
});

exports.getSubmissions = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) throw new ApiError(404, 'Not found');
  res.json(new ApiResponse(200, assignment.submissions));
});

exports.getAll = exports.getByLecture;
exports.getOne = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
exports.create = asyncHandler(async (req, res) => {
  const a = await Assignment.create(req.body);
  res.json(new ApiResponse(201, a));
});
exports.update = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
exports.remove = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
