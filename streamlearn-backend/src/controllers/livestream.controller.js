const LiveStream = require('../models/LiveStream');
const LivePoll = require('../models/LivePoll');
const { checkLiveAccess, canManageStream, assertAllowed } = require('../services/access.service');
const {
  requireObjectId,
  requireText,
  optionalString,
  clampInt,
  omitKeys,
} = require('../utils/validate.utils');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

const rtmpBase = () =>
  (process.env.RTMP_BASE_URL || 'rtmp://localhost:1935/live').replace(/\/+$/, '');
const hlsBase = () =>
  (process.env.LIVE_HLS_BASE_URL || 'http://localhost:8080/live').replace(/\/+$/, '');

// Never writable through the API: the server decides who owns a stream, its key and its state
const SERVER_MANAGED = [
  '_id',
  '__v',
  'createdAt',
  'updatedAt',
  'ownerId',
  'streamKey',
  'rtmpUrl',
  'hlsUrl',
  'status',
  'startedAt',
  'endedAt',
  'peakViewers',
  'totalViewers',
  'recordingUrl',
];

/**
 * What a viewer may see about a stream. The stream key is the password for broadcasting,
 * and hlsUrl / recordingUrl bypass the audience rules, so they are only shown to people who
 * manage the stream (viewers get the playback link from /stream-url after an access check).
 */
const present = (stream, user) => {
  const data = stream.toObject ? stream.toObject() : { ...stream };
  if (!canManageStream(user, stream)) {
    delete data.streamKey;
    delete data.rtmpUrl;
    delete data.hlsUrl;
    delete data.recordingUrl;
  }
  return data;
};

const loadStream = async (id) => {
  requireObjectId(id, 'stream id');
  const stream = await LiveStream.findById(id);
  if (!stream) throw new ApiError(404, 'Stream not found');
  return stream;
};

const loadManagedStream = async (user, id) => {
  const stream = await loadStream(id);
  if (!canManageStream(user, stream))
    throw new ApiError(403, 'You can only manage your own streams');
  return stream;
};

exports.getAll = asyncHandler(async (req, res) => {
  const status = ['scheduled', 'live', 'ended'].includes(req.query.status)
    ? req.query.status
    : undefined;
  const page = clampInt(req.query.page, 1, 1, 10000);
  const limit = clampInt(req.query.limit, 20, 1, 100);
  const streams = await LiveStream.find(status ? { status } : {})
    .populate('ownerId', 'name avatar')
    .sort({ status: 1, scheduledAt: 1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  res.json(
    new ApiResponse(
      200,
      streams.map((s) => present(s, req.user))
    )
  );
});

exports.getOne = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id, 'stream id');
  const stream = await LiveStream.findById(req.params.id).populate('ownerId', 'name avatar');
  if (!stream) throw new ApiError(404, 'Stream not found');
  res.json(new ApiResponse(200, present(stream, req.user)));
});

exports.getHLSUrl = asyncHandler(async (req, res) => {
  const stream = await loadStream(req.params.id);
  assertAllowed(await checkLiveAccess(req.user, stream));
  if (stream.status !== 'live') throw new ApiError(400, 'Stream is not live');
  if (!stream.hlsUrl) throw new ApiError(404, 'Stream URL not available');
  res.json(new ApiResponse(200, { hlsUrl: stream.hlsUrl }));
});

exports.create = asyncHandler(async (req, res) => {
  const body = omitKeys(req.body, SERVER_MANAGED);
  const stream = new LiveStream({
    title: requireText(body.title, 'Title', 200),
    description: optionalString(body.description, 'Description', 2000),
    thumbnail: optionalString(body.thumbnail, 'Thumbnail', 1000),
    audience: body.audience,
    batchId: body.batchId,
    scheduledAt: body.scheduledAt,
    chatEnabled: body.chatEnabled,
    pollEnabled: body.pollEnabled,
    recordingEnabled: body.recordingEnabled,
    ownerId: req.user._id,
  });
  stream.rtmpUrl = `${rtmpBase()}/${stream.streamKey}`;
  stream.hlsUrl = `${hlsBase()}/${stream.streamKey}/index.m3u8`;
  await stream.save();
  // The creator gets the key once here and again from /admin/:id/credentials
  res.status(201).json(new ApiResponse(201, stream, 'Live stream created'));
});

exports.getCredentials = asyncHandler(async (req, res) => {
  const stream = await loadManagedStream(req.user, req.params.id);
  res.json(
    new ApiResponse(200, {
      rtmpUrl: stream.rtmpUrl,
      streamKey: stream.streamKey,
      hlsUrl: stream.hlsUrl,
    })
  );
});

exports.update = asyncHandler(async (req, res) => {
  await loadManagedStream(req.user, req.params.id);
  const stream = await LiveStream.findByIdAndUpdate(
    req.params.id,
    omitKeys(req.body, SERVER_MANAGED),
    { new: true, runValidators: true }
  );
  res.json(new ApiResponse(200, stream, 'Updated'));
});

exports.remove = asyncHandler(async (req, res) => {
  await loadManagedStream(req.user, req.params.id);
  await LiveStream.findByIdAndDelete(req.params.id);
  res.json(new ApiResponse(200, {}, 'Deleted'));
});

exports.startStream = asyncHandler(async (req, res) => {
  await loadManagedStream(req.user, req.params.id);
  const stream = await LiveStream.findOneAndUpdate(
    { _id: req.params.id, status: 'scheduled' },
    { status: 'live', startedAt: new Date() },
    { new: true }
  );
  if (!stream) throw new ApiError(400, 'Only a scheduled stream can be started');
  res.json(new ApiResponse(200, stream, 'Stream started'));
});

exports.endStream = asyncHandler(async (req, res) => {
  await loadManagedStream(req.user, req.params.id);
  const stream = await LiveStream.findOneAndUpdate(
    { _id: req.params.id, status: 'live' },
    { status: 'ended', endedAt: new Date() },
    { new: true }
  );
  if (!stream) throw new ApiError(400, 'Only a live stream can be ended');
  res.json(new ApiResponse(200, stream, 'Stream ended'));
});

exports.createPoll = asyncHandler(async (req, res) => {
  const stream = await loadManagedStream(req.user, req.params.id);
  const question = requireText(req.body.question, 'Question', 300);
  const { options } = req.body;
  if (
    !Array.isArray(options) ||
    options.length < 2 ||
    options.length > 10 ||
    !options.every((o) => typeof o === 'string' && o.trim() && o.length <= 100)
  )
    throw new ApiError(400, 'Provide 2 to 10 options (text, max 100 characters each)');

  await LivePoll.updateMany({ streamId: stream._id }, { isActive: false });
  const poll = await LivePoll.create({
    streamId: stream._id,
    question,
    options: options.map((text) => ({ text: text.trim(), votes: 0 })),
    endsAt: req.body.endsAt,
  });
  const { getIO } = require('../config/socket');
  getIO()?.of('/live-stream').to(String(stream._id)).emit('new-poll', poll);
  res.status(201).json(new ApiResponse(201, poll, 'Poll created'));
});

exports.getAnalytics = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id, 'stream id');
  const stream = await LiveStream.findById(req.params.id).select(
    'peakViewers totalViewers startedAt endedAt title'
  );
  if (!stream) throw new ApiError(404, 'Not found');
  const polls = await LivePoll.find({ streamId: req.params.id });
  res.json(new ApiResponse(200, { stream, polls }));
});
