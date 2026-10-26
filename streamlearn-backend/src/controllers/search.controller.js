const { search, getSuggestions } = require('../services/search.service');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

// GET /api/search?q=&type=&genre=&language=&year=&access=&sort=&page=&limit=
exports.search = asyncHandler(async (req, res) => {
  res.json(new ApiResponse(200, await search(req.query)));
});

// GET /api/search/suggestions?q=
exports.suggestions = asyncHandler(async (req, res) => {
  res.json(new ApiResponse(200, await getSuggestions(req.query.q)));
});
