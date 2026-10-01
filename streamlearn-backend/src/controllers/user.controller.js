const User     = require('../models/User');
const cloudinary = require('../config/cloudinary');
const { ApiError }    = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler }= require('../utils/asyncHandler');
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => { const d='./uploads/temp'; fs.mkdirSync(d,{recursive:true}); cb(null,d); },
  filename: (req, file, cb) => cb(null, `avatar-${Date.now()}${path.extname(file.originalname)}`)
});
exports.avatarUploadMiddleware = multer({
  storage, limits:{fileSize:5*1024*1024},
  fileFilter:(req,file,cb)=>file.mimetype.startsWith('image/')?cb(null,true):cb(new Error('Images only'))
}).single('avatar');

exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('subscription.planId', 'name features price').select('-password -refreshToken');
  res.json(new ApiResponse(200, user));
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const user = await User.findByIdAndUpdate(req.user._id, { name, phone }, { new:true })
    .select('-password -refreshToken');
  res.json(new ApiResponse(200, user, 'Profile updated'));
});

exports.updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Image file required');
  const result = await cloudinary.uploader.upload(req.file.path, {
    folder:'avatars', transformation:[{width:300,height:300,crop:'fill'}]
  });
  fs.unlinkSync(req.file.path);
  await User.findByIdAndUpdate(req.user._id, { avatar:result.secure_url });
  res.json(new ApiResponse(200, { avatar:result.secure_url }, 'Avatar updated'));
});

exports.getProfiles = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('profiles activeProfile');
  res.json(new ApiResponse(200, { profiles:user.profiles, activeProfile:user.activeProfile }));
});

exports.addProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user.profiles.length >= 5) throw new ApiError(400, 'Maximum 5 profiles');
  const { name, kidMode=false } = req.body;
  if (!name) throw new ApiError(400, 'Name required');
  user.profiles.push({ name, kidMode });
  await user.save();
  res.json(new ApiResponse(201, user.profiles, 'Profile added'));
});

exports.updateProfileByIndex = asyncHandler(async (req, res) => {
  const user  = await User.findById(req.user._id);
  const index = parseInt(req.params.index);
  if (index < 0 || index >= user.profiles.length) throw new ApiError(404, 'Profile not found');
  const { name, kidMode, preferences } = req.body;
  if (name) user.profiles[index].name = name;
  if (kidMode !== undefined) user.profiles[index].kidMode = kidMode;
  if (preferences) user.profiles[index].preferences = { ...user.profiles[index].preferences, ...preferences };
  await user.save();
  res.json(new ApiResponse(200, user.profiles[index], 'Updated'));
});

exports.deleteProfile = asyncHandler(async (req, res) => {
  const user  = await User.findById(req.user._id);
  const index = parseInt(req.params.index);
  if (index === 0) throw new ApiError(400, 'Cannot delete primary profile');
  if (index < 0 || index >= user.profiles.length) throw new ApiError(404, 'Profile not found');
  user.profiles.splice(index, 1);
  if (user.activeProfile >= user.profiles.length) user.activeProfile = 0;
  await user.save();
  res.json(new ApiResponse(200, {}, 'Deleted'));
});

exports.switchProfile = asyncHandler(async (req, res) => {
  const user  = await User.findById(req.user._id);
  const index = parseInt(req.params.index);
  if (index < 0 || index >= user.profiles.length) throw new ApiError(404, 'Not found');
  user.activeProfile = index;
  await user.save();
  res.json(new ApiResponse(200, { activeProfile:index, profile:user.profiles[index] }));
});

exports.getWatchHistory = asyncHandler(async (req, res) => {
  const user    = await User.findById(req.user._id).select('profiles activeProfile');
  const profile = user.profiles[user.activeProfile];
  const Content = require('../models/Content');
  const history = await Content.find({ _id:{$in:profile.watchHistory||[]} })
    .select('title slug thumbnail type duration').limit(50);
  res.json(new ApiResponse(200, history));
});

exports.saveContinueWatching = asyncHandler(async (req, res) => {
  const { contentId, episodeId, lectureId, timestamp } = req.body;
  if (!contentId) throw new ApiError(400, 'contentId required');
  const user    = await User.findById(req.user._id);
  const profile = user.profiles[user.activeProfile];
  const existing = profile.continueWatching.findIndex(c => c.contentId?.toString() === contentId);
  const entry = { contentId, episodeId, lectureId, timestamp:timestamp||0, updatedAt:new Date() };
  if (existing >= 0) profile.continueWatching[existing] = entry;
  else profile.continueWatching.unshift(entry);
  if (profile.continueWatching.length > 50) profile.continueWatching = profile.continueWatching.slice(0,50);
  await user.save();
  res.json(new ApiResponse(200, {}, 'Saved'));
});

// Admin: get all users
exports.getAllUsers = asyncHandler(async (req, res) => {
  const { page=1, limit=20, search } = req.query;
  const query = { role:'viewer' };
  if (search) query.$or = [
    { name: { $regex:search, $options:'i' } },
    { email:{ $regex:search, $options:'i' } }
  ];
  const [users, total] = await Promise.all([
    User.find(query).select('-password -refreshToken').sort('-createdAt')
      .skip((page-1)*limit).limit(parseInt(limit)),
    User.countDocuments(query)
  ]);
  res.json(new ApiResponse(200, { users, total, page:parseInt(page), pages:Math.ceil(total/limit) }));
});

exports.getNotifCount = asyncHandler(async (req, res) => {
  const Notification = require('../models/Notification');
  const count = await Notification.countDocuments({ userId:req.user._id, isRead:false });
  res.json(new ApiResponse(200, { count }));
});
