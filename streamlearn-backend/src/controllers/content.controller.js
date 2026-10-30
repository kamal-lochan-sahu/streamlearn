const Content = require('../models/Content');
const Episode = require('../models/Episode');
const Section = require('../models/Section');
const Lecture = require('../models/Lecture');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { buildStreamUrl, QUALITIES } = require('../utils/hls.utils');
const { get: cGet, set: cSet, del: cDel } = require('../services/cache.service');
const { transcodingQueue } = require('../queue/jobQueue');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const slugify = require('slugify');
const {
  checkContentAccess,
  assertAllowed,
  canManageContent,
  isPublished,
  loadManageableContent,
  CONTENT_ACCESS_FIELDS,
} = require('../services/access.service');
const { contentResumeAt, resumeInfo } = require('../services/resume.service');
const { hlsRoot, hlsDirName } = require('../utils/paths.utils');
const { videoUpload, imageUpload, removeFile } = require('../utils/upload.utils');
const { requireObjectId, isObjectId, omitKeys } = require('../utils/validate.utils');
const {
  search: searchCatalog,
  parseCatalogInput,
  buildCatalogQuery,
  catalogCacheKey,
  publishedFilter,
  LIST_FIELDS,
} = require('../services/search.service');

exports.uploadMiddleware = videoUpload;
exports.imageUploadMiddleware = imageUpload;

// Fields only the server may set (an update must never rewrite ownership, video files or stats)
const SERVER_MANAGED = [
  '_id',
  '__v',
  'createdAt',
  'updatedAt',
  'ownerId',
  'slug',
  'videoFiles',
  'transcodeStatus',
  'viewCount',
  'rating',
];

const detailKey = (slug) => `content:detail:v2:${slug}`;

// The player and course pages used to hand over an id where the API wanted a slug (and the other
// way round). Every title endpoint under /:slug now accepts BOTH, so old links and bookmarks work.
const slugOrIdFilter = (param) =>
  isObjectId(param) ? { $or: [{ _id: param }, { slug: param }] } : { slug: param };

// ── helpers ──────────────────────────────────────────
const makeSlug = async (title, id = null) => {
  let slug = slugify(title, { lower: true, strict: true });
  const exists = await Content.findOne({ slug, ...(id && { _id: { $ne: id } }) });
  if (exists) slug = `${slug}-${Date.now()}`;
  return slug;
};

// ── GET /api/content  (browse + filters) ─────────────
exports.getAll = asyncHandler(async (req, res) => {
  const params = parseCatalogInput({ ...req.query, q: undefined });
  const cacheKey = catalogCacheKey('content:browse:v2', params);
  const cached = await cGet(cacheKey);
  if (cached) return res.json(new ApiResponse(200, cached));

  const query = buildCatalogQuery(params);
  const [items, total] = await Promise.all([
    Content.find(query).sort(params.sort).skip(params.skip).limit(params.limit).select(LIST_FIELDS),
    Content.countDocuments(query),
  ]);
  const data = { items, total, page: params.page, pages: Math.ceil(total / params.limit) };
  await cSet(cacheKey, data, 300);
  res.json(new ApiResponse(200, data));
});

// ── GET /api/content/featured ─────────────────────────
exports.getFeatured = asyncHandler(async (req, res) => {
  const cached = await cGet('content:featured');
  if (cached) return res.json(new ApiResponse(200, cached));
  const items = await Content.find({ ...publishedFilter(), isFeatured: true })
    .sort('-createdAt')
    .limit(10)
    .select(
      'title slug thumbnail banner shortDesc description type genre releaseYear rating ageRating'
    );
  await cSet('content:featured', items, 600);
  res.json(new ApiResponse(200, items));
});

// ── GET /api/content/trending ─────────────────────────
exports.getTrending = asyncHandler(async (req, res) => {
  const cached = await cGet('content:trending');
  if (cached) return res.json(new ApiResponse(200, cached));
  const items = await Content.find(publishedFilter())
    .sort('-viewCount -rating.average')
    .limit(20)
    .select('title slug thumbnail type genre releaseYear duration rating viewCount');
  await cSet('content:trending', items, 300);
  res.json(new ApiResponse(200, items));
});

// ── GET /api/content/new-releases ────────────────────
exports.getNewReleases = asyncHandler(async (req, res) => {
  const items = await Content.find(publishedFilter())
    .sort('-createdAt')
    .limit(20)
    .select('title slug thumbnail type genre releaseYear duration rating');
  res.json(new ApiResponse(200, items));
});

// ── GET /api/content/continue-watching ───────────────
// One query for all titles (it used to be one query per entry) and only titles that can
// still be watched. Newest first, with the episode/lecture to continue.
exports.getContinueWatching = asyncHandler(async (req, res) => {
  const user = req.user;
  const profile = user.profiles[user.activeProfile];
  const entries = [...(profile?.continueWatching || [])]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 20);
  if (!entries.length) return res.json(new ApiResponse(200, []));

  const contents = await Content.find({
    _id: { $in: entries.map((e) => e.contentId) },
    ...publishedFilter(),
  }).select('title slug thumbnail type duration');
  const byId = new Map(contents.map((c) => [String(c._id), c]));

  const items = entries
    .filter((e) => byId.has(String(e.contentId)))
    .map((e) => ({
      ...byId.get(String(e.contentId)).toObject(),
      timestamp: e.timestamp,
      episodeId: e.episodeId || null,
      lectureId: e.lectureId || null,
      updatedAt: e.updatedAt,
    }));
  res.json(new ApiResponse(200, items));
});

// ── GET /api/content/recommendations ─────────────────
exports.getRecommendations = asyncHandler(async (req, res) => {
  const { getRecommendations } = require('../services/recommendation.service');
  const items = await getRecommendations(req.user);
  res.json(new ApiResponse(200, items));
});

// ── GET /api/content/:slug (slug or id) ───────────────
// Published titles are cached and public. A draft, scheduled or expired title is visible only
// to people who manage it (so an admin or creator can preview before publishing).
exports.getBySlug = asyncHandler(async (req, res) => {
  const param = req.params.slug;
  if (!isObjectId(param)) {
    const cached = await cGet(detailKey(param));
    if (cached) return res.json(new ApiResponse(200, cached));
  }

  // videoFiles never leave the server through this endpoint; playback goes through /stream
  const content = await Content.findOne(slugOrIdFilter(param))
    .select('-videoFiles')
    .populate('instructor', 'name avatar');
  if (!content) throw new ApiError(404, 'Content not found');

  const published = isPublished(content);
  if (!published && !canManageContent(req.user, content))
    throw new ApiError(404, 'Content not found');

  // Increment view count
  if (published) Content.findByIdAndUpdate(content._id, { $inc: { viewCount: 1 } }).exec();

  const extra = {};
  if (content.type === 'series') {
    extra.episodes = await Episode.find({
      contentId: content._id,
      ...(published && { isActive: true }),
    })
      .sort('seasonNumber episodeNumber')
      .select('-videoFiles');
  }
  if (content.type === 'course') {
    extra.sections = await Section.find({ contentId: content._id })
      .sort('order')
      .populate({
        path: 'lectures',
        select: '-videoFiles -notes -transcript',
        // students never see lectures that are still drafts; managers previewing a draft course do
        ...(published && { match: { isActive: true } }),
        options: { sort: { order: 1 } },
      });
  }

  const data = { ...content.toObject(), ...extra };
  if (published) await cSet(detailKey(content.slug), data, 300);
  res.json(new ApiResponse(200, data));
});

// ── GET /api/content/:slug/resume ─────────────────────
// Where this user left off (episode / lecture + seconds), so "Resume" can start the right video.
exports.getResume = asyncHandler(async (req, res) => {
  const content = await Content.findOne(slugOrIdFilter(req.params.slug)).select(
    `type ${CONTENT_ACCESS_FIELDS}`
  );
  if (!content) throw new ApiError(404, 'Content not found');
  if (!isPublished(content) && !canManageContent(req.user, content))
    throw new ApiError(404, 'Content not found');
  res.json(new ApiResponse(200, await resumeInfo(req.user, content)));
});

// ── GET /api/content/:slug/stream ────────────────────
// The access check (free / subscription / purchase / owner) happens here, before a playback
// link is created. The link itself is a short-lived signed token (see utils/hls.utils.js).
exports.getStreamUrl = asyncHandler(async (req, res) => {
  const { quality = 'master' } = req.query;
  const content = await Content.findOne(slugOrIdFilter(req.params.slug)).select(
    `videoFiles type thumbnail ${CONTENT_ACCESS_FIELDS}`
  );
  if (!content) throw new ApiError(404, 'Content not found');
  assertAllowed(await checkContentAccess(req.user, content));

  if (!content.videoFiles?.master) throw new ApiError(404, 'Video not ready yet');
  const wanted = QUALITIES.includes(quality) && content.videoFiles[quality] ? quality : 'master';
  const url = buildStreamUrl(req, hlsDirName('content', content._id), wanted);
  res.json(
    new ApiResponse(200, {
      url,
      quality: wanted,
      contentId: content._id,
      thumbnail: content.thumbnail,
      resumeAt: contentResumeAt(req.user, content._id),
    })
  );
});

// ── GET /api/content/:id/related ─────────────────────
exports.getRelated = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const content = await Content.findOne({ _id: req.params.id, isActive: true }).select(
    'type genre'
  );
  if (!content) throw new ApiError(404, 'Content not found');
  const items = await Content.find({
    ...publishedFilter(),
    _id: { $ne: content._id },
    $or: [{ type: content.type }, { genre: { $in: content.genre } }],
  })
    .limit(12)
    .select('title slug thumbnail type genre duration rating');
  res.json(new ApiResponse(200, items));
});

// ── POST /api/content/search ──────────────────────────
exports.search = asyncHandler(async (req, res) => {
  // GET /content/search uses the query string, POST /content/search the JSON body
  const input = req.method === 'GET' ? req.query : req.body;
  res.json(new ApiResponse(200, await searchCatalog(input)));
});

// ── GET /api/content/:slug/episodes ──────────────────
exports.getEpisodes = asyncHandler(async (req, res) => {
  const content = await Content.findOne(slugOrIdFilter(req.params.slug)).select(
    'ownerId isActive expiryDate schedulePublish'
  );
  if (!content || (!isPublished(content) && !canManageContent(req.user, content)))
    throw new ApiError(404, 'Content not found');
  const episodes = await Episode.find({ contentId: content._id, isActive: true })
    .sort('seasonNumber episodeNumber')
    .select('-videoFiles');
  res.json(new ApiResponse(200, episodes));
});

// ── ADMIN: POST /api/content/admin/create ────────────
exports.create = asyncHandler(async (req, res) => {
  const {
    title,
    type,
    description,
    shortDesc,
    genre,
    language,
    releaseYear,
    duration,
    ageRating,
    access,
    price,
    skillLevel,
    whatYouLearn,
    tags,
  } = req.body;
  if (!title || !type) throw new ApiError(400, 'Title and type required');
  const slug = await makeSlug(title);
  const content = await Content.create({
    ownerId: req.user._id,
    title,
    slug,
    type,
    description,
    shortDesc,
    genre: genre || [],
    language: language || [],
    releaseYear,
    duration,
    ageRating,
    access: access || 'subscribers',
    price: price || 0,
    skillLevel,
    whatYouLearn: whatYouLearn || [],
    tags: tags || [],
    instructor: req.user._id,
  });
  res.status(201).json(new ApiResponse(201, content, 'Content created'));
});

// ── ADMIN: PUT /api/content/admin/:id ────────────────
exports.update = asyncHandler(async (req, res) => {
  await loadManageableContent(req.user, req.params.id);
  const content = await Content.findByIdAndUpdate(
    req.params.id,
    omitKeys(req.body, SERVER_MANAGED),
    { new: true, runValidators: true }
  );
  await cDel(detailKey(content.slug));
  res.json(new ApiResponse(200, content, 'Updated'));
});

// ── ADMIN: DELETE /api/content/admin/:id ─────────────
exports.remove = asyncHandler(async (req, res) => {
  const content = await Content.findByIdAndDelete(req.params.id);
  if (!content) throw new ApiError(404, 'Content not found');
  await cDel(detailKey(content.slug));
  res.json(new ApiResponse(200, {}, 'Deleted'));
});

// ── ADMIN: POST /api/content/admin/:id/upload ─────────
exports.uploadVideo = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Video file required');
  try {
    const content = await loadManageableContent(req.user, req.params.id);
    const id = String(content._id);

    const outputDir = require('path').join(hlsRoot(), hlsDirName('content', id));
    fs.mkdirSync(outputDir, { recursive: true });

    await Content.findByIdAndUpdate(id, { transcodeStatus: 'processing' });

    const job = await transcodingQueue.add({
      inputPath: req.file.path,
      outputDir,
      contentId: id,
      model: 'content',
      type: content.type,
      ownerId: String(req.user._id),
    });

    res.json(new ApiResponse(200, { jobId: job.id, message: 'Transcoding started' }));
  } catch (err) {
    removeFile(req.file.path); // do not leave the upload behind when it was refused
    throw err;
  }
});

// ── ADMIN: POST /api/content/admin/:id/thumbnail ──────
exports.uploadThumbnail = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Image required');
  try {
    await loadManageableContent(req.user, req.params.id);
    const result = await cloudinary.uploader.upload(req.file.path, { folder: 'thumbnails' });
    await Content.findByIdAndUpdate(req.params.id, { thumbnail: result.secure_url });
    res.json(new ApiResponse(200, { thumbnail: result.secure_url }));
  } finally {
    removeFile(req.file.path);
  }
});

// ── ADMIN: PUT /api/content/admin/:id/toggle ──────────
exports.toggle = asyncHandler(async (req, res) => {
  const content = await loadManageableContent(req.user, req.params.id);
  content.isActive = !content.isActive;
  await content.save();
  await cDel(detailKey(content.slug));
  res.json(new ApiResponse(200, { isActive: content.isActive }));
});

// ── ADMIN: GET /api/content/admin/:id/analytics ───────
exports.getAnalytics = asyncHandler(async (req, res) => {
  const content = await Content.findById(req.params.id).select('viewCount rating title');
  if (!content) throw new ApiError(404, 'Content not found');
  res.json(
    new ApiResponse(200, {
      viewCount: content.viewCount,
      rating: content.rating,
      title: content.title,
    })
  );
});

// ── Transcode status polling ───────────────────────────
exports.getTranscodeStatus = asyncHandler(async (req, res) => {
  const content = await loadManageableContent(req.user, req.params.id);
  res.json(
    new ApiResponse(200, {
      status: content.transcodeStatus,
      ready: content.transcodeStatus === 'done',
      videoFiles: content.transcodeStatus === 'done' ? content.videoFiles : null,
    })
  );
});
