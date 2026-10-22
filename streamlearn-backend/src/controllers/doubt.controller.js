const Doubt = require('../models/Doubt');
const Lecture = require('../models/Lecture');
const Content = require('../models/Content');
const {
  checkContentAccess,
  checkLectureAccess,
  assertAllowed,
  canManageContent,
  CONTENT_ACCESS_FIELDS,
} = require('../services/access.service');
const { requireObjectId, requireText } = require('../utils/validate.utils');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

const contentOf = async (contentId) => {
  const content = await Content.findById(contentId).select(CONTENT_ACCESS_FIELDS);
  if (!content) throw new ApiError(404, 'Course not found');
  return content;
};

// Doubts are part of the course: only people who can watch the course can read or write them.
exports.getByLecture = asyncHandler(async (req, res) => {
  requireObjectId(req.params.lectureId, 'lecture id');
  const lecture = await Lecture.findById(req.params.lectureId).select('contentId isFreePreview');
  if (!lecture) throw new ApiError(404, 'Lecture not found');
  assertAllowed(await checkLectureAccess(req.user, lecture, await contentOf(lecture.contentId)));

  const doubts = await Doubt.find({ lectureId: lecture._id })
    .populate('userId', 'name avatar')
    .populate('answers.userId', 'name avatar role')
    .sort('-createdAt')
    .limit(200);
  res.json(new ApiResponse(200, doubts));
});

exports.create = asyncHandler(async (req, res) => {
  const { contentId, lectureId, timestamp } = req.body;
  requireObjectId(contentId, 'content id');
  const question = requireText(req.body.question, 'Question', 2000);
  const content = await contentOf(contentId);

  if (lectureId !== undefined) {
    requireObjectId(lectureId, 'lecture id');
    const lecture = await Lecture.findOne({ _id: lectureId, contentId }).select('isFreePreview');
    if (!lecture) throw new ApiError(400, 'Lecture does not belong to this course');
    assertAllowed(await checkLectureAccess(req.user, lecture, content));
  } else {
    assertAllowed(await checkContentAccess(req.user, content));
  }
  if (timestamp !== undefined && (!Number.isFinite(timestamp) || timestamp < 0))
    throw new ApiError(400, 'Invalid timestamp');

  const doubt = await Doubt.create({
    contentId,
    lectureId,
    userId: req.user._id,
    question,
    timestamp,
  });
  await doubt.populate('userId', 'name avatar');
  res.status(201).json(new ApiResponse(201, doubt, 'Doubt posted'));
});

exports.answer = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id, 'doubt id');
  const answer = requireText(req.body.answer, 'Answer', 5000);
  const existing = await Doubt.findById(req.params.id).select('contentId lectureId');
  if (!existing) throw new ApiError(404, 'Doubt not found');
  const content = await contentOf(existing.contentId);
  assertAllowed(await checkContentAccess(req.user, content));

  const doubt = await Doubt.findByIdAndUpdate(
    req.params.id,
    {
      $push: {
        answers: {
          userId: req.user._id,
          answer,
          // "instructor" badge only for people who actually run this course
          isInstructor: canManageContent(req.user, content),
        },
      },
    },
    { new: true }
  ).populate('answers.userId', 'name avatar role');
  res.json(new ApiResponse(200, doubt, 'Answer added'));
});

// Only the person who asked, or the course owner / staff, can close a doubt.
exports.resolve = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id, 'doubt id');
  const existing = await Doubt.findById(req.params.id).select('userId contentId');
  if (!existing) throw new ApiError(404, 'Doubt not found');
  const content = await Content.findById(existing.contentId).select('ownerId');
  const isAuthor = String(existing.userId) === String(req.user._id);
  if (!isAuthor && !(content && canManageContent(req.user, content)))
    throw new ApiError(403, 'Only the author or the instructor can resolve this doubt');

  const doubt = await Doubt.findByIdAndUpdate(req.params.id, { isResolved: true }, { new: true });
  res.json(new ApiResponse(200, doubt, 'Marked resolved'));
});
