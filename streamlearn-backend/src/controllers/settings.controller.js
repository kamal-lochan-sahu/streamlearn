const Settings = require('../models/Settings');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

const getOrCreate = async (ownerId) => {
  let settings = await Settings.findOne({ ownerId });
  if (!settings) settings = await Settings.create({ ownerId });
  return settings;
};

exports.get = asyncHandler(async (req, res) => {
  const settings = await getOrCreate(req.user._id);
  res.json(new ApiResponse(200, settings));
});

exports.update = asyncHandler(async (req, res) => {
  const settings = await Settings.findOneAndUpdate(
    { ownerId: req.user._id },
    { $set: req.body },
    { new: true, upsert: true }
  );
  res.json(new ApiResponse(200, settings, 'Settings updated'));
});

exports.updateBranding = asyncHandler(async (req, res) => {
  const settings = await Settings.findOneAndUpdate(
    { ownerId: req.user._id },
    { $set: { platform: req.body } },
    { new: true, upsert: true }
  );
  res.json(new ApiResponse(200, settings.platform, 'Branding updated'));
});

exports.updateFeatures = asyncHandler(async (req, res) => {
  const settings = await Settings.findOneAndUpdate(
    { ownerId: req.user._id },
    { $set: { features: req.body } },
    { new: true, upsert: true }
  );
  res.json(new ApiResponse(200, settings.features, 'Features updated'));
});

exports.updatePayment = asyncHandler(async (req, res) => {
  const settings = await Settings.findOneAndUpdate(
    { ownerId: req.user._id },
    { $set: { payment: req.body } },
    { new: true, upsert: true }
  );
  res.json(new ApiResponse(200, settings.payment, 'Payment settings updated'));
});

exports.updateStreaming = asyncHandler(async (req, res) => {
  const settings = await Settings.findOneAndUpdate(
    { ownerId: req.user._id },
    { $set: { streaming: req.body } },
    { new: true, upsert: true }
  );
  res.json(new ApiResponse(200, settings.streaming, 'Streaming settings updated'));
});

exports.getAll = exports.get;
exports.getOne = exports.get;
exports.create = exports.update;
exports.remove = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
