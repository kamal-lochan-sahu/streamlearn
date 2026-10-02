const Plan = require('../models/Plan');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

exports.getAll = asyncHandler(async (req, res) => {
  const plans = await Plan.find({ isActive: true }).sort('sortOrder price.monthly');
  res.json(new ApiResponse(200, plans));
});

exports.getAllAdmin = asyncHandler(async (req, res) => {
  const plans = await Plan.find().sort('sortOrder');
  res.json(new ApiResponse(200, plans));
});

exports.create = asyncHandler(async (req, res) => {
  const plan = await Plan.create(req.body);
  res.json(new ApiResponse(201, plan, 'Plan created'));
});

exports.update = asyncHandler(async (req, res) => {
  const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!plan) throw new ApiError(404, 'Plan not found');
  res.json(new ApiResponse(200, plan, 'Updated'));
});

exports.remove = asyncHandler(async (req, res) => {
  await Plan.findByIdAndDelete(req.params.id);
  res.json(new ApiResponse(200, {}, 'Deleted'));
});

exports.getOne = asyncHandler(async (req, res) => {
  const plan = await Plan.findById(req.params.id);
  if (!plan) throw new ApiError(404, 'Plan not found');
  res.json(new ApiResponse(200, plan));
});
