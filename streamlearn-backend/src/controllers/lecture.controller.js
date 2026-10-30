const fs = require('fs');
const path = require('path');
const Lecture = require('../models/Lecture');
const Section = require('../models/Section');
const Content = require('../models/Content');
const { buildStreamUrl } = require('../utils/hls.utils');
const { transcodingQueue } = require('../queue/jobQueue');
const cloudinary = require('../config/cloudinary');
const {
  checkLectureAccess,
  assertAllowed,
  canManageContent,
  loadManageableContent,
  CONTENT_ACCESS_FIELDS,
} = require('../services/access.service');
const { lectureResumeAt } = require('../services/resume.service');
const { hlsRoot, hlsDirName } = require('../utils/paths.utils');
const { lectureUpload, removeFile } = require('../utils/upload.utils');
const { requireObjectId, requireHttpUrl, omitKeys } = require('../utils/validate.utils');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

exports.uploadMiddleware = lectureUpload;

const SERVER_MANAGED = [
  '_id',
  '__v',
  'createdAt',
  'updatedAt',
  'contentId',
  'videoFiles',
  'transcodeStatus',
];

// Fields students must never see in listings: raw video files, notes (paid material), transcript.
const LISTING_SELECT = '-videoFiles -notes -transcript';

exports.getByContent = asyncHandler(async (req, res) => {
  requireObjectId(req.params.contentId, 'content id');
  const content = await Content.findById(req.params.contentId).select('ownerId isActive');
  if (!content) throw new ApiError(404, 'Content not found');
  if (!content.isActive && !canManageContent(req.user, content))
    throw new ApiError(404, 'Content not found');

  const sections = await Section.find({ contentId: content._id })
    .sort('order')
    .populate({ path: 'lectures', select: LISTING_SELECT, options: { sort: { order: 1 } } });
  res.json(new ApiResponse(200, sections));
});

exports.getStreamUrl = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id, 'lecture id');
  const lecture = await Lecture.findById(req.params.id).select(
    'videoFiles isFreePreview isActive contentId notes'
  );
  if (!lecture) throw new ApiError(404, 'Lecture not found');
  const content = await Content.findById(lecture.contentId).select(CONTENT_ACCESS_FIELDS);
  if (!content) throw new ApiError(404, 'Course not found');

  // The course's own rules apply (subscription, purchase, owner), except for free-preview lectures
  const access = await checkLectureAccess(req.user, lecture, content);
  assertAllowed(access);
  if (!lecture.isActive && !canManageContent(req.user, content))
    throw new ApiError(404, 'Lecture not available');

  if (!lecture.videoFiles?.master) throw new ApiError(404, 'Video not ready');
  const url = buildStreamUrl(req, hlsDirName('lecture', lecture._id));
  res.json(
    new ApiResponse(200, {
      url,
      contentId: content._id,
      resumeAt: await lectureResumeAt(req.user, content._id, lecture._id),
      // notes only for people with full access, not for free-preview visitors
      notes: access.full ? lecture.notes || null : null,
    })
  );
});

exports.create = asyncHandler(async (req, res) => {
  requireObjectId(req.body.contentId, 'content id');
  requireObjectId(req.body.sectionId, 'section id');
  await loadManageableContent(req.user, req.body.contentId);
  const section = await Section.findOne({ _id: req.body.sectionId, contentId: req.body.contentId });
  if (!section) throw new ApiError(400, 'Section does not belong to this content');

  const lecture = await Lecture.create({
    ...omitKeys(req.body, SERVER_MANAGED),
    contentId: req.body.contentId,
  });
  await Section.findByIdAndUpdate(section._id, { $push: { lectures: lecture._id } });
  res.status(201).json(new ApiResponse(201, lecture, 'Lecture created'));
});

exports.update = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id, 'lecture id');
  const existing = await Lecture.findById(req.params.id).select('contentId');
  if (!existing) throw new ApiError(404, 'Not found');
  await loadManageableContent(req.user, existing.contentId);

  const data = omitKeys(req.body, SERVER_MANAGED);
  if (data.sectionId !== undefined) {
    requireObjectId(data.sectionId, 'section id');
    const section = await Section.findOne({ _id: data.sectionId, contentId: existing.contentId });
    if (!section) throw new ApiError(400, 'Section does not belong to this content');
  }
  const lecture = await Lecture.findByIdAndUpdate(req.params.id, data, {
    new: true,
    runValidators: true,
  });
  res.json(new ApiResponse(200, lecture, 'Updated'));
});

exports.remove = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id, 'lecture id');
  const lecture = await Lecture.findByIdAndDelete(req.params.id);
  if (lecture?.sectionId)
    await Section.findByIdAndUpdate(lecture.sectionId, { $pull: { lectures: lecture._id } });
  res.json(new ApiResponse(200, {}, 'Deleted'));
});

exports.uploadVideo = asyncHandler(async (req, res) => {
  const files = [req.files?.video?.[0], req.files?.notes?.[0]].filter(Boolean);
  try {
    requireObjectId(req.params.id, 'lecture id');
    const lecture = await Lecture.findById(req.params.id).select('contentId');
    if (!lecture) throw new ApiError(404, 'Lecture not found');
    await loadManageableContent(req.user, lecture.contentId);

    const { id } = req.params;
    if (req.files?.video?.[0]) {
      const outputDir = path.join(hlsRoot(), hlsDirName('lecture', id));
      fs.mkdirSync(outputDir, { recursive: true });
      await Lecture.findByIdAndUpdate(id, { transcodeStatus: 'processing' });
      const job = await transcodingQueue.add({
        inputPath: req.files.video[0].path,
        outputDir,
        contentId: id,
        model: 'lecture',
        ownerId: String(req.user._id),
      });
      files.shift(); // the transcoder owns (and later deletes) this file now
      return res.json(new ApiResponse(200, { jobId: job.id, message: 'Transcoding queued' }));
    }
    if (req.files?.notes?.[0]) {
      const result = await cloudinary.uploader.upload(req.files.notes[0].path, {
        folder: 'lecture-notes',
        resource_type: 'raw',
        format: 'pdf',
      });
      await Lecture.findByIdAndUpdate(id, { notes: result.secure_url });
      return res.json(new ApiResponse(200, { notesUrl: result.secure_url }));
    }
    throw new ApiError(400, 'No file uploaded');
  } finally {
    files.forEach((f) => removeFile(f.path));
  }
});

exports.addNotes = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id, 'lecture id');
  const notesUrl = requireHttpUrl(req.body.notesUrl, 'Notes URL');
  const existing = await Lecture.findById(req.params.id).select('contentId');
  if (!existing) throw new ApiError(404, 'Lecture not found');
  await loadManageableContent(req.user, existing.contentId);

  const lecture = await Lecture.findByIdAndUpdate(
    req.params.id,
    { notes: notesUrl },
    { new: true }
  );
  res.json(new ApiResponse(200, lecture, 'Notes added'));
});
