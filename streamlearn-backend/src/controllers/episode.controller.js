const Episode = require('../models/Episode');
const Content = require('../models/Content');
const { generateSignedUrl } = require('../utils/hls.utils');
const { transcodingQueue } = require('../queue/jobQueue');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const multer = require('multer');
const fs = require('path');
const fss = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const d = './uploads/temp';
    fss.mkdirSync(d, { recursive: true });
    cb(null, d);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
exports.uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 * 1024 },
}).single('video');

exports.getByContent = asyncHandler(async (req, res) => {
  const content = await Content.findOne({ _id: req.params.contentId });
  if (!content) throw new ApiError(404, 'Series not found');
  const episodes = await Episode.find({ contentId: req.params.contentId, isActive: true })
    .sort('seasonNumber episodeNumber')
    .select('-videoFiles');
  res.json(new ApiResponse(200, episodes));
});

exports.getStreamUrl = asyncHandler(async (req, res) => {
  const episode = await Episode.findById(req.params.id).select('videoFiles');
  if (!episode?.videoFiles?.master) throw new ApiError(404, 'Stream not ready');
  const url = generateSignedUrl(episode.videoFiles.master);
  res.json(new ApiResponse(200, { url }));
});

exports.create = asyncHandler(async (req, res) => {
  const episode = await Episode.create(req.body);
  res.json(new ApiResponse(201, episode, 'Episode created'));
});

exports.update = asyncHandler(async (req, res) => {
  const episode = await Episode.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!episode) throw new ApiError(404, 'Episode not found');
  res.json(new ApiResponse(200, episode, 'Updated'));
});

exports.remove = asyncHandler(async (req, res) => {
  await Episode.findByIdAndDelete(req.params.id);
  res.json(new ApiResponse(200, {}, 'Deleted'));
});

exports.uploadVideo = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Video required');
  const { id } = req.params;
  const outputDir = require('path').join('./uploads/hls', 'ep-' + id);
  fss.mkdirSync(outputDir, { recursive: true });
  await Episode.findByIdAndUpdate(id, { transcodeStatus: 'processing' });
  const job = await transcodingQueue.add({
    inputPath: req.file.path,
    outputDir,
    contentId: id,
    model: 'episode',
  });
  res.json(new ApiResponse(200, { jobId: job.id }));
});

exports.getAll = exports.getByContent;
exports.getOne = exports.getStreamUrl;
