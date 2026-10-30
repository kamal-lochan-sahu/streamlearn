const User = require('../models/User');
const Content = require('../models/Content');
const Episode = require('../models/Episode');
const Lecture = require('../models/Lecture');
const Notification = require('../models/Notification');
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
const { queryString, escapeRegex, pageParams } = require('../utils/query.utils');

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
  res.status(201).json(new ApiResponse(201, user.profiles, 'Profile added'));
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
  if (user.activeProfile >= user.profiles.length) user.activeProfile = 0;
  await user.save();
  res.json(new ApiResponse(200, {}, 'Deleted'));
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

// Admin: list viewers, optional name/email search (matched literally, not as a pattern)
exports.getAllUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query, { defaultLimit: 20, maxLimit: 100 });
  const search = queryString(req.query.search, 'search', 60);
  const query = { role: 'viewer' };
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

exports.getNotifCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ userId: req.user._id, isRead: false });
  res.json(new ApiResponse(200, { count }));
});
