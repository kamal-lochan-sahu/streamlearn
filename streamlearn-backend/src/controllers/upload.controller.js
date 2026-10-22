const fs = require('fs');
const path = require('path');
const cloudinary = require('../config/cloudinary');
const { transcodingQueue } = require('../queue/jobQueue');
const Episode = require('../models/Episode');
const Lecture = require('../models/Lecture');
const { loadManageableContent, isStaff } = require('../services/access.service');
const { hlsRoot, hlsDirName } = require('../utils/paths.utils');
const { videoUpload, imageUpload, pdfUpload, removeFile } = require('../utils/upload.utils');
const { requireObjectId } = require('../utils/validate.utils');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

exports.videoUploadMiddleware = videoUpload;
exports.imageUploadMiddleware = imageUpload;
exports.pdfUploadMiddleware = pdfUpload;

const IMAGE_FOLDERS = ['uploads', 'thumbnails', 'banners', 'avatars'];

// POST /api/upload/video  { contentId, model: content | episode | lecture }
exports.uploadVideo = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Video file required');
  try {
    const { contentId, model = 'content' } = req.body;
    requireObjectId(contentId, 'content id');
    if (!['content', 'episode', 'lecture'].includes(model))
      throw new ApiError(400, 'Invalid model');

    // Find the course/series/movie this video belongs to, and make sure the user owns it
    let rootContentId = contentId;
    let Model;
    if (model === 'episode' || model === 'lecture') {
      Model = model === 'episode' ? Episode : Lecture;
      const item = await Model.findById(contentId).select('contentId');
      if (!item) throw new ApiError(404, `${model} not found`);
      rootContentId = item.contentId;
    } else {
      Model = require('../models/Content');
    }
    await loadManageableContent(req.user, rootContentId);

    const outputDir = path.join(hlsRoot(), hlsDirName(model, contentId));
    fs.mkdirSync(outputDir, { recursive: true });

    await Model.findByIdAndUpdate(contentId, { transcodeStatus: 'processing' });
    const job = await transcodingQueue.add({
      inputPath: req.file.path,
      outputDir,
      contentId,
      model,
      ownerId: String(req.user._id),
    });
    res.json(new ApiResponse(200, { jobId: job.id, message: 'Transcoding queued' }));
  } catch (err) {
    removeFile(req.file.path);
    throw err;
  }
});

// POST /api/upload/image
exports.uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Image required');
  try {
    const folder = IMAGE_FOLDERS.includes(req.body.folder) ? req.body.folder : 'uploads';
    const result = await cloudinary.uploader.upload(req.file.path, { folder });
    res.json(new ApiResponse(200, { url: result.secure_url, publicId: result.public_id }));
  } finally {
    removeFile(req.file.path);
  }
});

// POST /api/upload/pdf
exports.uploadPDF = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'PDF required');
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'notes',
      resource_type: 'raw',
      format: 'pdf',
    });
    res.json(new ApiResponse(200, { url: result.secure_url }));
  } finally {
    removeFile(req.file.path);
  }
});

// GET /api/upload/status/:jobId  (only the person who started the job, or staff)
exports.getTranscodeStatus = asyncHandler(async (req, res) => {
  const job = await transcodingQueue.getJob(req.params.jobId);
  if (!job) throw new ApiError(404, 'Job not found');
  if (!isStaff(req.user) && job.data?.ownerId !== String(req.user._id))
    throw new ApiError(404, 'Job not found');
  const state = await job.getState();
  res.json(new ApiResponse(200, { jobId: job.id, state, progress: job._progress }));
});
