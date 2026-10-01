const WatchParty = require('../models/WatchParty');
const { v4: uuidv4 } = require('uuid');
const { ApiError }    = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler }= require('../utils/asyncHandler');

exports.create = asyncHandler(async (req, res) => {
  const { contentId, episodeId } = req.body;
  if (!contentId) throw new ApiError(400, 'contentId required');
  const code = uuidv4().slice(0, 8).toUpperCase();
  const party = await WatchParty.create({
    hostId: req.user._id, contentId, episodeId,
    code, participants: [req.user._id], status: 'waiting'
  });
  res.json(new ApiResponse(201, party, 'Watch party created'));
});

exports.join = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const party = await WatchParty.findOne({ code: code.toUpperCase(), status: { $ne: 'ended' } });
  if (!party) throw new ApiError(404, 'Party not found or ended');
  if (!party.participants.includes(req.user._id)) {
    party.participants.push(req.user._id);
    if (party.status === 'waiting') party.status = 'active';
    await party.save();
  }
  await party.populate('contentId', 'title thumbnail slug videoFiles');
  res.json(new ApiResponse(200, party, 'Joined party'));
});

exports.getOne = asyncHandler(async (req, res) => {
  const party = await WatchParty.findById(req.params.id)
    .populate('participants', 'name avatar')
    .populate('contentId', 'title thumbnail slug');
  if (!party) throw new ApiError(404, 'Party not found');
  res.json(new ApiResponse(200, party));
});

exports.sync = asyncHandler(async (req, res) => {
  const { timestamp, isPlaying } = req.body;
  const party = await WatchParty.findByIdAndUpdate(req.params.id,
    { currentTimestamp: timestamp, isPlaying }, { new: true }
  );
  const { getIO } = require('../config/socket');
  getIO()?.of('/watch-party').to(req.params.id).emit('sync-update', { timestamp, isPlaying });
  res.json(new ApiResponse(200, party));
});

exports.chat = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) throw new ApiError(400, 'Message required');
  const party = await WatchParty.findByIdAndUpdate(req.params.id, {
    $push: { chat: { userId: req.user._id, name: req.user.name, message: message.trim() } }
  }, { new: true });
  res.json(new ApiResponse(200, party.chat.slice(-50)));
});

exports.leave = asyncHandler(async (req, res) => {
  const party = await WatchParty.findById(req.params.id);
  if (!party) throw new ApiError(404, 'Party not found');
  party.participants = party.participants.filter(p => p.toString() !== req.user._id.toString());
  if (party.hostId.toString() === req.user._id.toString()) party.status = 'ended';
  await party.save();
  res.json(new ApiResponse(200, {}, 'Left party'));
});

exports.getAll = asyncHandler(async (req, res) => res.json(new ApiResponse(200, [])));
exports.create = exports.create;
exports.update = exports.sync;
exports.remove = exports.leave;
