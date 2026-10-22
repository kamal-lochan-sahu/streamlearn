const crypto = require('crypto');
const WatchParty = require('../models/WatchParty');
const Content = require('../models/Content');
const Episode = require('../models/Episode');
const {
  checkContentAccess,
  assertAllowed,
  CONTENT_ACCESS_FIELDS,
} = require('../services/access.service');
const { requireObjectId, requireText } = require('../utils/validate.utils');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

const isMember = (party, user) => party.participants.some((p) => String(p) === String(user._id));
const isHost = (party, user) => String(party.hostId) === String(user._id);

/** Loads a party and makes sure the current user is part of it. */
const loadMemberParty = async (user, id) => {
  requireObjectId(id, 'party id');
  const party = await WatchParty.findById(id);
  if (!party) throw new ApiError(404, 'Party not found');
  if (!isMember(party, user)) throw new ApiError(403, 'You are not part of this party');
  return party;
};

const newCode = () => crypto.randomBytes(4).toString('hex').toUpperCase();

exports.create = asyncHandler(async (req, res) => {
  const { contentId, episodeId } = req.body;
  requireObjectId(contentId, 'content id');
  const content = await Content.findById(contentId).select(CONTENT_ACCESS_FIELDS);
  if (!content) throw new ApiError(404, 'Content not found');
  // You can only host a party for something you are allowed to watch yourself
  assertAllowed(await checkContentAccess(req.user, content));
  if (episodeId !== undefined) {
    requireObjectId(episodeId, 'episode id');
    if (!(await Episode.exists({ _id: episodeId, contentId })))
      throw new ApiError(400, 'Episode does not belong to this content');
  }

  let party;
  for (let attempt = 0; attempt < 3 && !party; attempt++) {
    try {
      party = await WatchParty.create({
        hostId: req.user._id,
        contentId,
        episodeId,
        code: newCode(),
        participants: [req.user._id],
        status: 'waiting',
      });
    } catch (err) {
      if (err.code !== 11000) throw err; // code collision: try another one
    }
  }
  if (!party) throw new ApiError(500, 'Could not create the party, please try again');
  res.status(201).json(new ApiResponse(201, party, 'Watch party created'));
});

exports.join = asyncHandler(async (req, res) => {
  const code = requireText(req.params.code, 'Code', 20);
  const party = await WatchParty.findOne({ code: code.toUpperCase(), status: { $ne: 'ended' } });
  if (!party) throw new ApiError(404, 'Party not found or ended');
  if (!isMember(party, req.user)) {
    party.participants.push(req.user._id);
    if (party.status === 'waiting') party.status = 'active';
    await party.save();
  }
  // videoFiles are not sent: everyone still has to pass the content access check to play it
  await party.populate('contentId', 'title thumbnail slug');
  res.json(new ApiResponse(200, party, 'Joined party'));
});

exports.getOne = asyncHandler(async (req, res) => {
  await loadMemberParty(req.user, req.params.id);
  const party = await WatchParty.findById(req.params.id)
    .populate('participants', 'name avatar')
    .populate('contentId', 'title thumbnail slug');
  res.json(new ApiResponse(200, party));
});

exports.sync = asyncHandler(async (req, res) => {
  const party = await loadMemberParty(req.user, req.params.id);
  if (!isHost(party, req.user)) throw new ApiError(403, 'Only the host controls playback');
  const { timestamp, isPlaying } = req.body;
  if (!Number.isFinite(timestamp) || timestamp < 0 || typeof isPlaying !== 'boolean')
    throw new ApiError(400, 'Invalid sync data');

  const updated = await WatchParty.findByIdAndUpdate(
    party._id,
    { currentTimestamp: timestamp, isPlaying },
    { new: true }
  );
  const { getIO } = require('../config/socket');
  getIO()?.of('/watch-party').to(String(party._id)).emit('sync-update', { timestamp, isPlaying });
  res.json(new ApiResponse(200, updated));
});

exports.chat = asyncHandler(async (req, res) => {
  const party = await loadMemberParty(req.user, req.params.id);
  const message = requireText(req.body.message, 'Message', 500);
  const updated = await WatchParty.findByIdAndUpdate(
    party._id,
    {
      $push: {
        chat: { $each: [{ userId: req.user._id, name: req.user.name, message }], $slice: -200 },
      },
    },
    { new: true }
  );
  res.json(new ApiResponse(200, updated.chat.slice(-50)));
});

exports.leave = asyncHandler(async (req, res) => {
  const party = await loadMemberParty(req.user, req.params.id);
  party.participants = party.participants.filter((p) => String(p) !== String(req.user._id));
  if (isHost(party, req.user)) party.status = 'ended';
  await party.save();
  res.json(new ApiResponse(200, {}, 'Left party'));
});
