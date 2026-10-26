const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const {
  requireText,
  optionalString,
  optionalBoolean,
  optionalInt,
  optionalNumber,
  optionalEnum,
  requireObjectId,
} = require('../utils/validate.utils');

const QUALITIES = ['480p', '720p', '1080p', '4K'];
const MAX_PRICE = 10000000;

/**
 * Reads a plan from untrusted input and returns a flat { 'path.to.field': value } map of ONLY the
 * fields admins may set (so _id, createdAt, ... are never written). Missing fields are left out,
 * which makes the same function work for create and for partial updates.
 */
const parsePlanInput = (body) => {
  const input = body && typeof body === 'object' ? body : {};
  const price = input.price && typeof input.price === 'object' ? input.price : {};
  const feat = input.features && typeof input.features === 'object' ? input.features : {};

  const fields = {
    name: input.name === undefined ? undefined : requireText(input.name, 'Plan name', 80),
    description: optionalString(input.description, 'Description', 500),
    badge: optionalString(input.badge, 'Badge', 30),
    isActive: optionalBoolean(input.isActive, 'isActive'),
    isPopular: optionalBoolean(input.isPopular, 'isPopular'),
    sortOrder: optionalInt(input.sortOrder, 'sortOrder', -1000, 1000),
    'price.monthly': optionalNumber(price.monthly, 'Monthly price', 0, MAX_PRICE),
    'price.yearly': optionalNumber(price.yearly, 'Yearly price', 0, MAX_PRICE),
    'price.lifetime': optionalNumber(price.lifetime, 'Lifetime price', 0, MAX_PRICE),
    'features.maxProfiles': optionalInt(feat.maxProfiles, 'maxProfiles', 1, 5),
    'features.maxDownloads': optionalInt(feat.maxDownloads, 'maxDownloads', 0, 1000),
    'features.quality': optionalEnum(feat.quality, QUALITIES, 'quality'),
    'features.simultaneousStreams': optionalInt(
      feat.simultaneousStreams,
      'simultaneousStreams',
      1,
      10
    ),
    'features.downloadEnabled': optionalBoolean(feat.downloadEnabled, 'downloadEnabled'),
    'features.liveAccess': optionalBoolean(feat.liveAccess, 'liveAccess'),
    'features.adsEnabled': optionalBoolean(feat.adsEnabled, 'adsEnabled'),
    'features.offlineAccess': optionalBoolean(feat.offlineAccess, 'offlineAccess'),
  };
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
};

exports.getAll = asyncHandler(async (req, res) => {
  const plans = await Plan.find({ isActive: true }).sort('sortOrder price.monthly');
  res.json(new ApiResponse(200, plans));
});

exports.getAllAdmin = asyncHandler(async (req, res) => {
  const plans = await Plan.find().sort('sortOrder');
  res.json(new ApiResponse(200, plans));
});

exports.create = asyncHandler(async (req, res) => {
  const fields = parsePlanInput(req.body);
  if (!fields.name) throw new ApiError(400, 'Plan name required');
  // Dot paths ("price.monthly") are turned into nested objects by Mongoose when building the document
  const plan = new Plan();
  for (const [path, value] of Object.entries(fields)) plan.set(path, value);
  await plan.save();
  res.status(201).json(new ApiResponse(201, plan, 'Plan created'));
});

exports.update = asyncHandler(async (req, res) => {
  const id = requireObjectId(req.params.id, 'plan id');
  const fields = parsePlanInput(req.body);
  if (!Object.keys(fields).length) throw new ApiError(400, 'Nothing to update');
  const plan = await Plan.findByIdAndUpdate(
    id,
    { $set: fields },
    { new: true, runValidators: true }
  );
  if (!plan) throw new ApiError(404, 'Plan not found');
  res.json(new ApiResponse(200, plan, 'Updated'));
});

exports.remove = asyncHandler(async (req, res) => {
  const id = requireObjectId(req.params.id, 'plan id');
  // Deleting a plan that people are paying for would orphan their subscriptions
  if (await Subscription.exists({ planId: id, status: 'active' }))
    throw new ApiError(409, 'This plan has active subscribers. Deactivate it instead of deleting.');
  const plan = await Plan.findByIdAndDelete(id);
  if (!plan) throw new ApiError(404, 'Plan not found');
  res.json(new ApiResponse(200, {}, 'Deleted'));
});

exports.getOne = asyncHandler(async (req, res) => {
  const id = requireObjectId(req.params.id, 'plan id');
  const plan = await Plan.findOne({ _id: id, isActive: true });
  if (!plan) throw new ApiError(404, 'Plan not found');
  res.json(new ApiResponse(200, plan));
});
