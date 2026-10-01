const cloudinary = require('../config/cloudinary');
const { transcodingQueue } = require('../queue/jobQueue');
const Content  = require('../models/Content');
const Episode  = require('../models/Episode');
const Lecture  = require('../models/Lecture');
const { ApiError }    = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler }= require('../utils/asyncHandler');
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const d = './uploads/temp'; fs.mkdirSync(d, { recursive: true }); cb(null, d);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s/g,'_')}`)
});

exports.videoUploadMiddleware = multer({
  storage, limits: { fileSize: 10 * 1024 * 1024 * 1024 }  // 10GB
}).single('video');

exports.imageUploadMiddleware = multer({
  storage, limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Images only'))
}).single('image');

exports.pdfUploadMiddleware = multer({
  storage, limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => file.mimetype === 'application/pdf' ? cb(null, true) : cb(new Error('PDF only'))
}).single('pdf');

// POST /api/upload/video
exports.uploadVideo = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Video file required');
  const { contentId, model = 'content' } = req.body;
  if (!contentId) throw new ApiError(400, 'contentId required');

  const ModelMap = { content: Content, episode: Episode, lecture: Lecture };
  const Model = ModelMap[model];
  if (!Model) throw new ApiError(400, 'Invalid model');

  const outputDir = path.join('./uploads/hls', contentId);
  fs.mkdirSync(outputDir, { recursive: true });

  await Model.findByIdAndUpdate(contentId, { transcodeStatus: 'processing' });
  const job = await transcodingQueue.add({ inputPath: req.file.path, outputDir, contentId, model });
  res.json(new ApiResponse(200, { jobId: job.id, message: 'Transcoding queued' }));
});

// POST /api/upload/image
exports.uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Image required');
  const { folder = 'uploads' } = req.body;
  const result = await cloudinary.uploader.upload(req.file.path, { folder });
  fs.unlinkSync(req.file.path);
  res.json(new ApiResponse(200, { url: result.secure_url, publicId: result.public_id }));
});

// POST /api/upload/pdf
exports.uploadPDF = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'PDF required');
  const result = await cloudinary.uploader.upload(req.file.path, {
    folder: 'notes', resource_type: 'raw', format: 'pdf'
  });
  fs.unlinkSync(req.file.path);
  res.json(new ApiResponse(200, { url: result.secure_url }));
});

// GET /api/upload/status/:jobId
exports.getTranscodeStatus = asyncHandler(async (req, res) => {
  const job = await transcodingQueue.getJob(req.params.jobId);
  if (!job) throw new ApiError(404, 'Job not found');
  const state    = await job.getState();
  const progress = job._progress;
  res.json(new ApiResponse(200, { jobId: job.id, state, progress }));
});

exports.getAll = asyncHandler(async (req, res) => res.json(new ApiResponse(200, [])));
exports.getOne = exports.getTranscodeStatus;
exports.create = exports.uploadVideo;
exports.update = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
exports.remove = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
