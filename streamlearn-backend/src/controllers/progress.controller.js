const CourseProgress = require('../models/CourseProgress');
const Content = require('../models/Content');
const Lecture = require('../models/Lecture');
const { generateCertificate } = require('../utils/certificate.utils');
const {
  checkLectureAccess,
  checkContentAccess,
  assertAllowed,
  CONTENT_ACCESS_FIELDS,
} = require('../services/access.service');
const { requireObjectId } = require('../utils/validate.utils');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

const loadContent = async (contentId) => {
  requireObjectId(contentId, 'content id');
  const content = await Content.findById(contentId).select(CONTENT_ACCESS_FIELDS);
  if (!content) throw new ApiError(404, 'Course not found');
  return content;
};

// Reading progress never creates a record (that used to let anyone fill the database with
// junk rows for any id). A record is created the first time the user actually makes progress.
exports.getProgress = asyncHandler(async (req, res) => {
  requireObjectId(req.params.contentId, 'content id');
  const progress = await CourseProgress.findOne({
    userId: req.user._id,
    contentId: req.params.contentId,
  });
  res.json(
    new ApiResponse(
      200,
      progress || {
        userId: req.user._id,
        contentId: req.params.contentId,
        completedLectures: [],
        completionPercent: 0,
        lastTimestamp: 0,
      }
    )
  );
});

exports.markLectureComplete = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;
  const { contentId } = req.body;
  requireObjectId(lectureId, 'lecture id');
  const content = await loadContent(contentId);

  // The lecture must really belong to this course and the user must be allowed to watch it,
  // otherwise random ids could be "completed" to reach 100% and earn a certificate.
  const lecture = await Lecture.findOne({ _id: lectureId, contentId }).select('isFreePreview');
  if (!lecture) throw new ApiError(404, 'Lecture not found in this course');
  assertAllowed(await checkLectureAccess(req.user, lecture, content));

  const progress = await CourseProgress.findOneAndUpdate(
    { userId: req.user._id, contentId },
    {
      $addToSet: { completedLectures: lecture._id },
      $set: { lastLecture: lecture._id },
      $setOnInsert: { enrolledAt: new Date() },
    },
    { new: true, upsert: true }
  );

  // Completion counts only lectures that exist in this course right now
  const lectureIds = (await Lecture.find({ contentId }).select('_id')).map((l) => String(l._id));
  const done = progress.completedLectures.filter((id) => lectureIds.includes(String(id))).length;
  if (lectureIds.length > 0)
    progress.completionPercent = Math.min(100, Math.round((done / lectureIds.length) * 100));
  if (progress.completionPercent >= 100 && !progress.completedAt) progress.completedAt = new Date();
  await progress.save();
  res.json(new ApiResponse(200, progress, 'Lecture marked complete'));
});

exports.saveTimestamp = asyncHandler(async (req, res) => {
  const { contentId, lectureId, timestamp } = req.body;
  const content = await loadContent(contentId);
  if (!Number.isFinite(timestamp) || timestamp < 0) throw new ApiError(400, 'Invalid timestamp');

  const update = { lastTimestamp: timestamp };
  if (lectureId !== undefined) {
    requireObjectId(lectureId, 'lecture id');
    const lecture = await Lecture.findOne({ _id: lectureId, contentId }).select('isFreePreview');
    if (!lecture) throw new ApiError(404, 'Lecture not found in this course');
    assertAllowed(await checkLectureAccess(req.user, lecture, content));
    update.lastLecture = lecture._id;
  } else {
    assertAllowed(await checkContentAccess(req.user, content));
  }

  await CourseProgress.findOneAndUpdate(
    { userId: req.user._id, contentId },
    { $set: update, $setOnInsert: { enrolledAt: new Date() } },
    { upsert: true }
  );
  res.json(new ApiResponse(200, {}, 'Progress saved'));
});

exports.getCertificate = asyncHandler(async (req, res) => {
  requireObjectId(req.params.contentId, 'content id');
  const progress = await CourseProgress.findOne({
    userId: req.user._id,
    contentId: req.params.contentId,
  });
  if (!progress || progress.completionPercent < 100)
    throw new ApiError(400, 'Course not completed');
  if (!progress.certificateIssued) throw new ApiError(404, 'Certificate not generated yet');
  res.json(new ApiResponse(200, { certificateUrl: progress.certificateUrl }));
});

exports.generateCertificate = asyncHandler(async (req, res) => {
  const { contentId } = req.body;
  requireObjectId(contentId, 'content id');

  const [progress, content] = await Promise.all([
    CourseProgress.findOne({ userId: req.user._id, contentId }),
    Content.findById(contentId).populate('instructor', 'name'),
  ]);

  if (!progress || progress.completionPercent < 100 || !content)
    throw new ApiError(400, 'Complete the course first');
  if (progress.certificateIssued)
    return res.json(new ApiResponse(200, { certificateUrl: progress.certificateUrl }));

  const certUrl = await generateCertificate({
    studentName: req.user.name,
    courseName: content.title,
    completionDate: progress.completedAt?.toLocaleDateString('en-IN'),
    instructorName: content.instructor?.name || 'StreamLearn',
  });

  progress.certificateIssued = true;
  progress.certificateUrl = certUrl;
  await progress.save();

  res.json(new ApiResponse(200, { certificateUrl: certUrl }, 'Certificate generated'));
});
