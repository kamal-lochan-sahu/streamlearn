const Lecture = require('../models/Lecture');
const Section = require('../models/Section');
const Content = require('../models/Content');
const { generateSignedUrl } = require('../utils/hls.utils');
const { transcodingQueue } = require('../queue/jobQueue');
const cloudinary = require('../config/cloudinary');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const multer = require('multer');
const fss = require('fs');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const d = './uploads/temp';
    fss.mkdirSync(d, { recursive: true });
    cb(null, d);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
exports.uploadMiddleware = multer({ storage }).fields([
  { name: 'video', maxCount: 1 },
  { name: 'notes', maxCount: 1 },
]);

exports.getByContent = asyncHandler(async (req, res) => {
  const sections = await Section.find({ contentId: req.params.contentId })
    .sort('order')
    .populate({ path: 'lectures', options: { sort: { order: 1 } } });
  res.json(new ApiResponse(200, sections));
});

exports.getStreamUrl = asyncHandler(async (req, res) => {
  const lecture = await Lecture.findById(req.params.id).select('videoFiles isFreePreview');
  if (!lecture) throw new ApiError(404, 'Lecture not found');
  if (!lecture.isFreePreview) {
    const sub = req.user?.subscription;
    if (!sub || sub.status !== 'active') throw new ApiError(403, 'Subscription required');
  }
  if (!lecture.videoFiles?.master) throw new ApiError(404, 'Video not ready');
  const url = generateSignedUrl(lecture.videoFiles.master);
  res.json(new ApiResponse(200, { url }));
});

exports.create = asyncHandler(async (req, res) => {
  const lecture = await Lecture.create(req.body);
  if (req.body.sectionId) {
    await Section.findByIdAndUpdate(req.body.sectionId, { $push: { lectures: lecture._id } });
  }
  res.json(new ApiResponse(201, lecture, 'Lecture created'));
});

exports.update = asyncHandler(async (req, res) => {
  const lecture = await Lecture.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!lecture) throw new ApiError(404, 'Not found');
  res.json(new ApiResponse(200, lecture, 'Updated'));
});

exports.remove = asyncHandler(async (req, res) => {
  const lecture = await Lecture.findByIdAndDelete(req.params.id);
  if (lecture?.sectionId)
    await Section.findByIdAndUpdate(lecture.sectionId, { $pull: { lectures: lecture._id } });
  res.json(new ApiResponse(200, {}, 'Deleted'));
});

exports.uploadVideo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (req.files?.video?.[0]) {
    const outputDir = path.join('./uploads/hls', 'lec-' + id);
    fss.mkdirSync(outputDir, { recursive: true });
    await Lecture.findByIdAndUpdate(id, { transcodeStatus: 'processing' });
    const job = await transcodingQueue.add({
      inputPath: req.files.video[0].path,
      outputDir,
      contentId: id,
      model: 'lecture',
    });
    return res.json(new ApiResponse(200, { jobId: job.id, message: 'Transcoding queued' }));
  }
  if (req.files?.notes?.[0]) {
    const result = await cloudinary.uploader.upload(req.files.notes[0].path, {
      folder: 'lecture-notes',
      resource_type: 'raw',
      format: 'pdf',
    });
    fss.unlinkSync(req.files.notes[0].path);
    await Lecture.findByIdAndUpdate(id, { notes: result.secure_url });
    return res.json(new ApiResponse(200, { notesUrl: result.secure_url }));
  }
  throw new ApiError(400, 'No file uploaded');
});

exports.addNotes = asyncHandler(async (req, res) => {
  const { notesUrl } = req.body;
  const lecture = await Lecture.findByIdAndUpdate(
    req.params.id,
    { notes: notesUrl },
    { new: true }
  );
  res.json(new ApiResponse(200, lecture, 'Notes added'));
});

exports.getAll = exports.getByContent;
exports.getOne = exports.getStreamUrl;
