const { search, getSuggestions } = require('../services/search.service');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler }= require('../utils/asyncHandler');

exports.search = asyncHandler(async (req, res) => {
  const { q, type, genre, language, year, page = 1, limit = 20 } = req.query;
  const result = await search({ q, type, genre, language, year, page: parseInt(page), limit: parseInt(limit) });
  res.json(new ApiResponse(200, result));
});

exports.suggestions = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const results = await getSuggestions(q);
  res.json(new ApiResponse(200, results));
});

exports.getAll = exports.search;
exports.getOne = exports.suggestions;
exports.create = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
exports.update = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
exports.remove = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
