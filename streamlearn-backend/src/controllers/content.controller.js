const Content   = require('../models/Content');
const Episode   = require('../models/Episode');
const Section   = require('../models/Section');
const Lecture   = require('../models/Lecture');
const { ApiError }    = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler }= require('../utils/asyncHandler');
const { generateSignedUrl } = require('../utils/hls.utils');
const { get: cGet, set: cSet, del: cDel } = require('../services/cache.service');
const { transcodingQueue } = require('../queue/jobQueue');
const cloudinary = require('../config/cloudinary');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const slugify = require('slugify');

// ── Multer setup ──────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = process.env.TEMP_UPLOAD_PATH || './uploads/temp';
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 * 1024 } });
exports.uploadMiddleware = upload.single('video');
exports.imageUploadMiddleware = upload.single('image');

// ── helpers ──────────────────────────────────────────
const makeSlug = async (title, id = null) => {
  let slug = slugify(title, { lower: true, strict: true });
  const exists = await Content.findOne({ slug, ...(id && { _id: { $ne: id } }) });
  if (exists) slug = `${slug}-${Date.now()}`;
  return slug;
};

// ── GET /api/content  (browse + filters) ─────────────
exports.getAll = asyncHandler(async (req, res) => {
  const { type, genre, language, year, access, page = 1, limit = 20, sort = '-createdAt' } = req.query;
  const query = { isActive: true };
  if (type)     query.type = type;
  if (genre)    query.genre = { $in: Array.isArray(genre) ? genre : [genre] };
  if (language) query.language = { $in: Array.isArray(language) ? language : [language] };
  if (year)     query.releaseYear = parseInt(year);
  if (access)   query.access = access;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const cacheKey = `content:browse:${JSON.stringify(req.query)}`;
  const cached = await cGet(cacheKey);
  if (cached) return res.json(new ApiResponse(200, cached));

  const [items, total] = await Promise.all([
    Content.find(query).sort(sort).skip(skip).limit(parseInt(limit))
      .select('title slug thumbnail banner type genre language releaseYear duration rating viewCount access isFeatured'),
    Content.countDocuments(query)
  ]);
  const data = { items, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) };
  await cSet(cacheKey, data, 300);
  res.json(new ApiResponse(200, data));
});

// ── GET /api/content/featured ─────────────────────────
exports.getFeatured = asyncHandler(async (req, res) => {
  const cached = await cGet('content:featured');
  if (cached) return res.json(new ApiResponse(200, cached));
  const items = await Content.find({ isActive: true, isFeatured: true })
    .sort('-createdAt').limit(10)
    .select('title slug thumbnail banner shortDesc description type genre releaseYear rating ageRating');
  await cSet('content:featured', items, 600);
  res.json(new ApiResponse(200, items));
});

// ── GET /api/content/trending ─────────────────────────
exports.getTrending = asyncHandler(async (req, res) => {
  const cached = await cGet('content:trending');
  if (cached) return res.json(new ApiResponse(200, cached));
  const items = await Content.find({ isActive: true })
    .sort('-viewCount -rating.average').limit(20)
    .select('title slug thumbnail type genre releaseYear duration rating viewCount');
  await cSet('content:trending', items, 300);
  res.json(new ApiResponse(200, items));
});

// ── GET /api/content/new-releases ────────────────────
exports.getNewReleases = asyncHandler(async (req, res) => {
  const items = await Content.find({ isActive: true })
    .sort('-createdAt').limit(20)
    .select('title slug thumbnail type genre releaseYear duration rating');
  res.json(new ApiResponse(200, items));
});

// ── GET /api/content/continue-watching ───────────────
exports.getContinueWatching = asyncHandler(async (req, res) => {
  const user = req.user;
  const profile = user.profiles[user.activeProfile];
  if (!profile?.continueWatching?.length) return res.json(new ApiResponse(200, []));

  const populated = await Promise.all(
    profile.continueWatching.slice(0, 20).map(async (cw) => {
      const content = await Content.findById(cw.contentId)
        .select('title slug thumbnail type duration');
      if (!content) return null;
      return { ...content.toObject(), timestamp: cw.timestamp, updatedAt: cw.updatedAt };
    })
  );
  res.json(new ApiResponse(200, populated.filter(Boolean)));
});

// ── GET /api/content/recommendations ─────────────────
exports.getRecommendations = asyncHandler(async (req, res) => {
  const { getRecommendations } = require('../services/recommendation.service');
  const items = await getRecommendations(req.user);
  res.json(new ApiResponse(200, items));
});

// ── GET /api/content/:slug ────────────────────────────
exports.getBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const cacheKey = `content:detail:${slug}`;
  const cached = await cGet(cacheKey);
  if (cached) return res.json(new ApiResponse(200, cached));

  const content = await Content.findOne({ slug, isActive: true })
    .populate('instructor', 'name avatar');
  if (!content) throw new ApiError(404, 'Content not found');

  // Increment view count
  Content.findByIdAndUpdate(content._id, { $inc: { viewCount: 1 } }).exec();

  let extra = {};
  if (content.type === 'series') {
    extra.episodes = await Episode.find({ contentId: content._id, isActive: true })
      .sort('seasonNumber episodeNumber').select('-videoFiles');
  }
  if (content.type === 'course') {
    extra.sections = await Section.find({ contentId: content._id })
      .sort('order').populate({ path: 'lectures', select: '-videoFiles', options: { sort: { order: 1 } } });
  }

  const data = { ...content.toObject(), ...extra };
  await cSet(cacheKey, data, 300);
  res.json(new ApiResponse(200, data));
});

// ── GET /api/content/:slug/stream ────────────────────
exports.getStreamUrl = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const { quality = 'master' } = req.query;
  const content = await Content.findOne({ slug }).select('videoFiles access type');
  if (!content) throw new ApiError(404, 'Content not found');

  const videoFiles = content.videoFiles;
  if (!videoFiles?.master) throw new ApiError(404, 'Video not ready yet');

  const url = quality === 'master' ? videoFiles.master : (videoFiles[quality] || videoFiles.master);
  const signedUrl = generateSignedUrl(url);
  res.json(new ApiResponse(200, { url: signedUrl, quality }));
});

// ── GET /api/content/:id/related ─────────────────────
exports.getRelated = asyncHandler(async (req, res) => {
  const content = await Content.findById(req.params.id).select('type genre');
  if (!content) throw new ApiError(404, 'Content not found');
  const items = await Content.find({
    isActive: true,
    _id: { $ne: content._id },
    $or: [{ type: content.type }, { genre: { $in: content.genre } }]
  }).limit(12).select('title slug thumbnail type genre duration rating');
  res.json(new ApiResponse(200, items));
});

// ── POST /api/content/search ──────────────────────────
exports.search = asyncHandler(async (req, res) => {
  const { q, type, genre, language, year, page = 1, limit = 20 } = req.body;
  const { search } = require('../services/search.service');
  const result = await search({ q, type, genre, language, year, page, limit });
  res.json(new ApiResponse(200, result));
});

// ── GET /api/content/:slug/episodes ──────────────────
exports.getEpisodes = asyncHandler(async (req, res) => {
  const content = await Content.findOne({ slug: req.params.slug });
  if (!content) throw new ApiError(404, 'Content not found');
  const episodes = await Episode.find({ contentId: content._id, isActive: true })
    .sort('seasonNumber episodeNumber').select('-videoFiles');
  res.json(new ApiResponse(200, episodes));
});

// ── ADMIN: POST /api/content/admin/create ────────────
exports.create = asyncHandler(async (req, res) => {
  const { title, type, description, shortDesc, genre, language, releaseYear,
          duration, ageRating, access, price, skillLevel, whatYouLearn, tags } = req.body;
  if (!title || !type) throw new ApiError(400, 'Title and type required');
  const slug = await makeSlug(title);
  const content = await Content.create({
    ownerId: req.user._id, title, slug, type, description, shortDesc,
    genre: genre || [], language: language || [], releaseYear, duration,
    ageRating, access: access || 'subscribers', price: price || 0,
    skillLevel, whatYouLearn: whatYouLearn || [], tags: tags || [],
    instructor: req.user._id
  });
  res.json(new ApiResponse(201, content, 'Content created'));
});

// ── ADMIN: PUT /api/content/admin/:id ────────────────
exports.update = asyncHandler(async (req, res) => {
  const content = await Content.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!content) throw new ApiError(404, 'Content not found');
  await cDel(`content:detail:${content.slug}`);
  res.json(new ApiResponse(200, content, 'Updated'));
});

// ── ADMIN: DELETE /api/content/admin/:id ─────────────
exports.remove = asyncHandler(async (req, res) => {
  const content = await Content.findByIdAndDelete(req.params.id);
  if (!content) throw new ApiError(404, 'Content not found');
  await cDel(`content:detail:${content.slug}`);
  res.json(new ApiResponse(200, {}, 'Deleted'));
});

// ── ADMIN: POST /api/content/admin/:id/upload ─────────
exports.uploadVideo = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Video file required');
  const { id } = req.params;
  const content = await Content.findById(id);
  if (!content) throw new ApiError(404, 'Content not found');

  const outputDir = path.join(process.env.HLS_OUTPUT_PATH || './uploads/hls', id);
  fs.mkdirSync(outputDir, { recursive: true });

  await Content.findByIdAndUpdate(id, { transcodeStatus: 'processing' });

  const job = await transcodingQueue.add({
    inputPath: req.file.path,
    outputDir,
    contentId: id,
    model: 'content',
    type: content.type
  });

  res.json(new ApiResponse(200, { jobId: job.id, message: 'Transcoding started' }));
});

// ── ADMIN: POST /api/content/admin/:id/thumbnail ──────
exports.uploadThumbnail = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Image required');
  const result = await cloudinary.uploader.upload(req.file.path, { folder: 'thumbnails' });
  fs.unlinkSync(req.file.path);
  const content = await Content.findByIdAndUpdate(req.params.id,
    { thumbnail: result.secure_url }, { new: true });
  res.json(new ApiResponse(200, { thumbnail: result.secure_url }));
});

// ── ADMIN: PUT /api/content/admin/:id/toggle ──────────
exports.toggle = asyncHandler(async (req, res) => {
  const content = await Content.findById(req.params.id);
  if (!content) throw new ApiError(404, 'Content not found');
  content.isActive = !content.isActive;
  await content.save();
  await cDel(`content:detail:${content.slug}`);
  res.json(new ApiResponse(200, { isActive: content.isActive }));
});

// ── ADMIN: GET /api/content/admin/:id/analytics ───────
exports.getAnalytics = asyncHandler(async (req, res) => {
  const content = await Content.findById(req.params.id).select('viewCount rating title');
  if (!content) throw new ApiError(404, 'Content not found');
  res.json(new ApiResponse(200, {
    viewCount: content.viewCount,
    rating: content.rating,
    title: content.title
  }));
});

// ── Transcode status polling ───────────────────────────
exports.getTranscodeStatus = asyncHandler(async (req, res) => {
  const content = await Content.findById(req.params.id).select('transcodeStatus videoFiles');
  if (!content) throw new ApiError(404, 'Not found');
  res.json(new ApiResponse(200, {
    status: content.transcodeStatus,
    ready: content.transcodeStatus === 'done',
    videoFiles: content.transcodeStatus === 'done' ? content.videoFiles : null
  }));
});
