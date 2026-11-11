const User = require('../models/User');
const Content = require('../models/Content');
const Episode = require('../models/Episode');
const Lecture = require('../models/Lecture');
const Notification = require('../models/Notification');
const Watchlist = require('../models/Watchlist');
const cloudinary = require('../config/cloudinary');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { avatarUpload, removeFile } = require('../utils/upload.utils');
const {
  requireText,
  optionalString,
  optionalBoolean,
  optionalStringList,
  optionalNumber,
  requireObjectId,
  parseIndex,
} = require('../utils/validate.utils');
const { queryString, queryEnum, escapeRegex, pageParams } = require('../utils/query.utils');

// Never send secrets (password hash, OTP hash, reset token ...) to a client.
const SAFE_USER =
  '-password -refreshToken -otp -oauthCode -resetPasswordToken -resetPasswordExpires';
const MAX_PROFILES = 5;

exports.avatarUploadMiddleware = avatarUpload;

exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('subscription.planId', 'name features price')
    .select(SAFE_USER);
  res.json(new ApiResponse(200, user));
});

// Only name and phone can be changed here. Role, email, subscription etc. are never taken from the body.
exports.updateProfile = asyncHandler(async (req, res) => {
  const update = {};
  if (req.body.name !== undefined) update.name = requireText(req.body.name, 'Name', 60);
  if (req.body.phone !== undefined) {
    const phone = optionalString(req.body.phone, 'Phone', 20) || '';
    if (phone && !/^[0-9+()\-\s]{6,20}$/.test(phone)) throw new ApiError(400, 'Invalid phone');
    update.phone = phone;
  }
  if (!Object.keys(update).length) throw new ApiError(400, 'Nothing to update');
  await User.updateOne({ _id: req.user._id }, { $set: update });
  const user = await User.findById(req.user._id).select(SAFE_USER);
  res.json(new ApiResponse(200, user, 'Profile updated'));
});

exports.updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Image file required');
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'avatars',
      transformation: [{ width: 300, height: 300, crop: 'fill' }],
    });
    await User.findByIdAndUpdate(req.user._id, { avatar: result.secure_url });
    res.json(new ApiResponse(200, { avatar: result.secure_url }, 'Avatar updated'));
  } finally {
    removeFile(req.file.path);
  }
});

exports.getProfiles = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('profiles activeProfile');
  res.json(new ApiResponse(200, { profiles: user.profiles, activeProfile: user.activeProfile }));
});

exports.addProfile = asyncHandler(async (req, res) => {
  const name = requireText(req.body.name, 'Name', 40);
  const kidMode = optionalBoolean(req.body.kidMode, 'kidMode') ?? false;
  const user = await User.findById(req.user._id);
  if (user.profiles.length >= MAX_PROFILES)
    throw new ApiError(400, `Maximum ${MAX_PROFILES} profiles`);
  user.profiles.push({ name, kidMode });
  await user.save();
  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { profiles: user.profiles, activeProfile: user.activeProfile },
        'Profile added'
      )
    );
});

exports.updateProfileByIndex = asyncHandler(async (req, res) => {
  const index = parseIndex(req.params.index, 'profile');
  const body = req.body || {};
  const name = body.name === undefined ? undefined : requireText(body.name, 'Name', 40);
  const kidMode = optionalBoolean(body.kidMode, 'kidMode');
  let preferences;
  if (body.preferences !== undefined) {
    if (
      !body.preferences ||
      typeof body.preferences !== 'object' ||
      Array.isArray(body.preferences)
    )
      throw new ApiError(400, 'preferences must be an object');
    preferences = {
      genres: optionalStringList(body.preferences.genres, 'genres'),
      languages: optionalStringList(body.preferences.languages, 'languages'),
    };
  }

  const user = await User.findById(req.user._id);
  if (index >= user.profiles.length) throw new ApiError(404, 'Profile not found');
  const profile = user.profiles[index];
  if (name !== undefined) profile.name = name;
  if (kidMode !== undefined) profile.kidMode = kidMode;
  if (preferences) {
    if (preferences.genres) profile.preferences.genres = preferences.genres;
    if (preferences.languages) profile.preferences.languages = preferences.languages;
  }
  await user.save();
  res.json(new ApiResponse(200, user.profiles[index], 'Updated'));
});

exports.deleteProfile = asyncHandler(async (req, res) => {
  const index = parseIndex(req.params.index, 'profile');
  if (index === 0) throw new ApiError(400, 'Cannot delete primary profile');
  const user = await User.findById(req.user._id);
  if (index >= user.profiles.length) throw new ApiError(404, 'Profile not found');
  user.profiles.splice(index, 1);
  // Profiles are addressed by position, so everything after the deleted one moves up by one.
  // The active profile must keep pointing at the same person (or fall back to the first).
  if (user.activeProfile === index) user.activeProfile = 0;
  else if (user.activeProfile > index) user.activeProfile -= 1;
  await user.save();

  // Watchlists are stored per profile position too: drop the deleted profile's list and move
  // the later ones up (one by one, lowest first, so the unique index is never hit twice).
  await Watchlist.deleteOne({ userId: req.user._id, profileIndex: index });
  const later = await Watchlist.find({ userId: req.user._id, profileIndex: { $gt: index } })
    .sort('profileIndex')
    .select('profileIndex');
  for (const list of later)
    await Watchlist.updateOne({ _id: list._id }, { $set: { profileIndex: list.profileIndex - 1 } });

  res.json(
    new ApiResponse(200, { profiles: user.profiles, activeProfile: user.activeProfile }, 'Deleted')
  );
});

exports.switchProfile = asyncHandler(async (req, res) => {
  const index = parseIndex(req.params.index, 'profile');
  const user = await User.findById(req.user._id);
  if (index >= user.profiles.length) throw new ApiError(404, 'Profile not found');
  user.activeProfile = index;
  await user.save();
  res.json(new ApiResponse(200, { activeProfile: index, profile: user.profiles[index] }));
});

exports.getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('profiles activeProfile');
  const profile = user.profiles[user.activeProfile];
  const history = await Content.find({ _id: { $in: profile?.watchHistory || [] } })
    .select('title slug thumbnail type duration')
    .limit(50);
  res.json(new ApiResponse(200, history));
});

const MAX_CONTINUE_WATCHING = 50;

// Saves "where I stopped" for the active profile. One entry per title (a series keeps its latest
// episode), newest first. The ids must really belong together, so nobody can fill the list with junk.
exports.saveContinueWatching = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const contentId = requireObjectId(body.contentId, 'contentId');
  const episodeId = body.episodeId ? requireObjectId(body.episodeId, 'episodeId') : undefined;
  const lectureId = body.lectureId ? requireObjectId(body.lectureId, 'lectureId') : undefined;
  const timestamp = optionalNumber(body.timestamp, 'timestamp', 0, 60 * 60 * 24 * 7) ?? 0;

  if (!(await Content.exists({ _id: contentId }))) throw new ApiError(404, 'Content not found');
  if (episodeId && !(await Episode.exists({ _id: episodeId, contentId })))
    throw new ApiError(404, 'Episode not found in this series');
  if (lectureId && !(await Lecture.exists({ _id: lectureId, contentId })))
    throw new ApiError(404, 'Lecture not found in this course');

  const entry = {
    contentId,
    episodeId,
    lectureId,
    timestamp: Math.floor(timestamp),
    updatedAt: new Date(),
  };

  const user = await User.findById(req.user._id);
  const profile = user.profiles[user.activeProfile];
  if (!profile) throw new ApiError(404, 'Profile not found');
  const kept = profile.continueWatching.filter((c) => c.contentId?.toString() !== contentId);
  profile.continueWatching = [entry, ...kept]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, MAX_CONTINUE_WATCHING);
  await user.save();
  res.json(new ApiResponse(200, {}, 'Saved'));
});

// Takes a title off "continue watching" (finished, or the user dismissed it)
exports.removeContinueWatching = asyncHandler(async (req, res) => {
  const contentId = requireObjectId(req.params.contentId, 'contentId');
  const user = await User.findById(req.user._id);
  const profile = user.profiles[user.activeProfile];
  if (!profile) throw new ApiError(404, 'Profile not found');
  profile.continueWatching = profile.continueWatching.filter(
    (c) => c.contentId?.toString() !== contentId
  );
  await user.save();
  res.json(new ApiResponse(200, {}, 'Removed'));
});

// Admin: list accounts, optional search (matched literally, not as a pattern), role and status
exports.getAllUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query, { defaultLimit: 20, maxLimit: 100 });
  const search = queryString(req.query.search, 'search', 60);
  const role = queryEnum(req.query.role, ['viewer', 'creator', 'admin', 'owner'], 'role');
  const status = queryEnum(req.query.status, ['active', 'banned'], 'status');
  const query = {};
  if (role) query.role = role;
  if (status) query.isActive = status === 'active';
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    query.$or = [{ name: pattern }, { email: pattern }];
  }
  const [users, total] = await Promise.all([
    User.find(query).select(SAFE_USER).sort('-createdAt').skip(skip).limit(limit),
    User.countDocuments(query),
  ]);
  res.json(new ApiResponse(200, { users, total, page, pages: Math.ceil(total / limit) }));
});

// The account an admin action is about. Nobody edits themselves here, nobody touches the
// owner, and only the owner touches other admins.
const loadManagedUser = async (req) => {
  const id = requireObjectId(req.params.id, 'user id');
  if (id === String(req.user._id))
    throw new ApiError(400, 'You cannot change your own account here');
  const target = await User.findById(id).select('role isActive');
  if (!target) throw new ApiError(404, 'User not found');
  if (target.role === 'owner') throw new ApiError(403, 'The owner account cannot be changed');
  if (target.role === 'admin' && req.user.role !== 'owner')
    throw new ApiError(403, 'Only the owner can change an admin');
  return target;
};

// PUT /api/users/admin/:id/status  { isActive: boolean }  (ban / unban)
exports.setUserStatus = asyncHandler(async (req, res) => {
  const isActive = optionalBoolean((req.body || {}).isActive, 'isActive');
  if (isActive === undefined) throw new ApiError(400, 'isActive (true or false) required');
  const target = await loadManagedUser(req);
  // A ban also ends the session: the refresh token is removed (the access token stops working
  // at once because every request loads the account and checks isActive).
  await User.updateOne(
    { _id: target._id },
    isActive ? { $set: { isActive } } : { $set: { isActive }, $unset: { refreshToken: 1 } }
  );
  res.json(new ApiResponse(200, { isActive }, isActive ? 'Account restored' : 'Account banned'));
});

// PUT /api/users/admin/:id/role  { role }  (owner only, see the route)
exports.setUserRole = asyncHandler(async (req, res) => {
  const role = queryEnum((req.body || {}).role, ['viewer', 'creator', 'admin'], 'role');
  if (!role) throw new ApiError(400, 'role required');
  const target = await loadManagedUser(req);
  await User.updateOne({ _id: target._id }, { $set: { role } });
  res.json(new ApiResponse(200, { role }, 'Role updated'));
});

exports.getNotifCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ userId: req.user._id, isRead: false });
  res.json(new ApiResponse(200, { count }));
});
