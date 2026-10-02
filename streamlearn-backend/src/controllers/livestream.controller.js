const LiveStream = require('../models/LiveStream');
const LivePoll = require('../models/LivePoll');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

exports.getAll = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = status ? { status } : {};
  const streams = await LiveStream.find(query)
    .populate('ownerId', 'name avatar')
    .sort({ status: 1, scheduledAt: 1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
  res.json(new ApiResponse(200, streams));
});

exports.getOne = asyncHandler(async (req, res) => {
  const stream = await LiveStream.findById(req.params.id).populate('ownerId', 'name avatar');
  if (!stream) throw new ApiError(404, 'Stream not found');
  res.json(new ApiResponse(200, stream));
});

exports.getHLSUrl = asyncHandler(async (req, res) => {
  const stream = await LiveStream.findById(req.params.id).select('hlsUrl status');
  if (!stream) throw new ApiError(404, 'Stream not found');
  if (stream.status !== 'live') throw new ApiError(400, 'Stream is not live');
  if (!stream.hlsUrl) throw new ApiError(404, 'Stream URL not available');
  res.json(new ApiResponse(200, { hlsUrl: stream.hlsUrl }));
});

exports.create = asyncHandler(async (req, res) => {
  const stream = await LiveStream.create({ ...req.body, ownerId: req.user._id });
  stream.rtmpUrl = `rtmp://localhost:1935/live/${stream.streamKey}`;
  stream.hlsUrl = `http://localhost:8080/live/${stream.streamKey}/index.m3u8`;
  await stream.save();
  res.json(new ApiResponse(201, stream, 'Live stream created'));
});

exports.update = asyncHandler(async (req, res) => {
  const stream = await LiveStream.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user._id },
    req.body,
    { new: true }
  );
  if (!stream) throw new ApiError(404, 'Stream not found');
  res.json(new ApiResponse(200, stream, 'Updated'));
});

exports.remove = asyncHandler(async (req, res) => {
  await LiveStream.findOneAndDelete({ _id: req.params.id, ownerId: req.user._id });
  res.json(new ApiResponse(200, {}, 'Deleted'));
});

exports.startStream = asyncHandler(async (req, res) => {
  const stream = await LiveStream.findByIdAndUpdate(
    req.params.id,
    { status: 'live', startedAt: new Date() },
    { new: true }
  );
  res.json(new ApiResponse(200, stream, 'Stream started'));
});

exports.endStream = asyncHandler(async (req, res) => {
  const stream = await LiveStream.findByIdAndUpdate(
    req.params.id,
    { status: 'ended', endedAt: new Date() },
    { new: true }
  );
  res.json(new ApiResponse(200, stream, 'Stream ended'));
});

exports.createPoll = asyncHandler(async (req, res) => {
  const { question, options, endsAt } = req.body;
  if (!question || !options?.length) throw new ApiError(400, 'Question and options required');
  await LivePoll.updateMany({ streamId: req.params.id }, { isActive: false });
  const poll = await LivePoll.create({
    streamId: req.params.id,
    question,
    options: options.map((text) => ({ text, votes: 0 })),
    endsAt,
  });
  const { getIO } = require('../config/socket');
  getIO()?.of('/live-stream').to(req.params.id).emit('new-poll', poll);
  res.json(new ApiResponse(201, poll, 'Poll created'));
});

exports.getAnalytics = asyncHandler(async (req, res) => {
  const stream = await LiveStream.findById(req.params.id).select(
    'peakViewers totalViewers startedAt endedAt title'
  );
  if (!stream) throw new ApiError(404, 'Not found');
  const polls = await LivePoll.find({ streamId: req.params.id });
  res.json(new ApiResponse(200, { stream, polls }));
});
