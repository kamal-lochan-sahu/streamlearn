const CourseProgress = require('../models/CourseProgress');
const Content = require('../models/Content');
const Section = require('../models/Section');
const { generateCertificate } = require('../utils/certificate.utils');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

exports.getProgress = asyncHandler(async (req, res) => {
  const { contentId } = req.params;
  let progress = await CourseProgress.findOne({ userId: req.user._id, contentId });
  if (!progress) {
    progress = await CourseProgress.create({
      userId: req.user._id,
      contentId,
      enrolledAt: new Date(),
    });
  }
  res.json(new ApiResponse(200, progress));
});

exports.markLectureComplete = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;
  const { contentId } = req.body;
  if (!contentId) throw new ApiError(400, 'contentId required');

  let progress = await CourseProgress.findOne({ userId: req.user._id, contentId });
  if (!progress) progress = await CourseProgress.create({ userId: req.user._id, contentId });

  if (!progress.completedLectures.includes(lectureId)) {
    progress.completedLectures.push(lectureId);
  }
  progress.lastLecture = lectureId;

  // Calculate completion %
  const sections = await Section.find({ contentId }).populate('lectures', '_id');
  const totalLectures = sections.reduce((sum, s) => sum + s.lectures.length, 0);
  if (totalLectures > 0) {
    progress.completionPercent = Math.round(
      (progress.completedLectures.length / totalLectures) * 100
    );
  }
  if (progress.completionPercent >= 100 && !progress.completedAt) {
    progress.completedAt = new Date();
  }
  await progress.save();
  res.json(new ApiResponse(200, progress, 'Lecture marked complete'));
});

exports.saveTimestamp = asyncHandler(async (req, res) => {
  const { contentId, lectureId, timestamp } = req.body;
  if (!contentId) throw new ApiError(400, 'contentId required');
  await CourseProgress.findOneAndUpdate(
    { userId: req.user._id, contentId },
    { lastLecture: lectureId, lastTimestamp: timestamp },
    { upsert: true }
  );
  res.json(new ApiResponse(200, {}, 'Progress saved'));
});

exports.getCertificate = asyncHandler(async (req, res) => {
  const { contentId } = req.params;
  const progress = await CourseProgress.findOne({ userId: req.user._id, contentId });
  if (!progress || progress.completionPercent < 100)
    throw new ApiError(400, 'Course not completed');
  if (!progress.certificateIssued) throw new ApiError(404, 'Certificate not generated yet');
  res.json(new ApiResponse(200, { certificateUrl: progress.certificateUrl }));
});

exports.generateCertificate = asyncHandler(async (req, res) => {
  const { contentId } = req.body;
  if (!contentId) throw new ApiError(400, 'contentId required');

  const [progress, content] = await Promise.all([
    CourseProgress.findOne({ userId: req.user._id, contentId }),
    Content.findById(contentId).populate('instructor', 'name'),
  ]);

  if (!progress || progress.completionPercent < 100)
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

exports.getAll = exports.getProgress;
exports.getOne = exports.getProgress;
exports.create = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
exports.update = exports.saveTimestamp;
exports.remove = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
