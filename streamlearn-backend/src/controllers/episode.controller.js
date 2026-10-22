const fs = require('fs');
const path = require('path');
const Episode = require('../models/Episode');
const Content = require('../models/Content');
const { buildStreamUrl } = require('../utils/hls.utils');
const { transcodingQueue } = require('../queue/jobQueue');
const {
  checkContentAccess,
  assertAllowed,
  canManageContent,
  loadManageableContent,
  CONTENT_ACCESS_FIELDS,
} = require('../services/access.service');
const { hlsRoot, hlsDirName } = require('../utils/paths.utils');
const { videoUpload, removeFile } = require('../utils/upload.utils');
const { requireObjectId, omitKeys } = require('../utils/validate.utils');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

exports.uploadMiddleware = videoUpload;

const SERVER_MANAGED = [
  '_id',
  '__v',
  'createdAt',
  'updatedAt',
  'contentId',
  'videoFiles',
  'transcodeStatus',
];

exports.getByContent = asyncHandler(async (req, res) => {
  requireObjectId(req.params.contentId, 'content id');
  const content = await Content.findOne({ _id: req.params.contentId, isActive: true });
  if (!content) throw new ApiError(404, 'Series not found');
  const episodes = await Episode.find({ contentId: content._id, isActive: true })
    .sort('seasonNumber episodeNumber')
    .select('-videoFiles');
  res.json(new ApiResponse(200, episodes));
});

exports.getStreamUrl = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id, 'episode id');
  const episode = await Episode.findById(req.params.id).select(
    'videoFiles isActive contentId thumbnail'
  );
  if (!episode) throw new ApiError(404, 'Episode not found');

  // An episode is watchable under the rules of the series it belongs to
  const content = await Content.findById(episode.contentId).select(CONTENT_ACCESS_FIELDS);
  if (!content) throw new ApiError(404, 'Series not found');
  assertAllowed(await checkContentAccess(req.user, content));
  if (!episode.isActive && !canManageContent(req.user, content))
    throw new ApiError(404, 'Episode not available');

  if (!episode.videoFiles?.master) throw new ApiError(404, 'Stream not ready');
  const url = buildStreamUrl(req, hlsDirName('episode', episode._id));
  res.json(
    new ApiResponse(200, {
      url,
      contentId: content._id,
      thumbnail: episode.thumbnail,
    })
  );
});

exports.create = asyncHandler(async (req, res) => {
  requireObjectId(req.body.contentId, 'content id');
  await loadManageableContent(req.user, req.body.contentId);
  const episode = await Episode.create({
    ...omitKeys(req.body, SERVER_MANAGED),
    contentId: req.body.contentId,
  });
  res.status(201).json(new ApiResponse(201, episode, 'Episode created'));
});

exports.update = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id, 'episode id');
  const existing = await Episode.findById(req.params.id).select('contentId');
  if (!existing) throw new ApiError(404, 'Episode not found');
  await loadManageableContent(req.user, existing.contentId);

  const episode = await Episode.findByIdAndUpdate(
    req.params.id,
    omitKeys(req.body, SERVER_MANAGED),
    { new: true, runValidators: true }
  );
  res.json(new ApiResponse(200, episode, 'Updated'));
});

exports.remove = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id, 'episode id');
  await Episode.findByIdAndDelete(req.params.id);
  res.json(new ApiResponse(200, {}, 'Deleted'));
});

exports.uploadVideo = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Video required');
  try {
    requireObjectId(req.params.id, 'episode id');
    const episode = await Episode.findById(req.params.id).select('contentId');
    if (!episode) throw new ApiError(404, 'Episode not found');
    await loadManageableContent(req.user, episode.contentId);

    const outputDir = path.join(hlsRoot(), hlsDirName('episode', episode._id));
    fs.mkdirSync(outputDir, { recursive: true });
    await Episode.findByIdAndUpdate(episode._id, { transcodeStatus: 'processing' });
    const job = await transcodingQueue.add({
      inputPath: req.file.path,
      outputDir,
      contentId: String(episode._id),
      model: 'episode',
      ownerId: String(req.user._id),
    });
    res.json(new ApiResponse(200, { jobId: job.id }));
  } catch (err) {
    removeFile(req.file.path);
    throw err;
  }
});
