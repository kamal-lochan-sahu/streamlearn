const Content = require('../models/Content');

const search = async ({ q, type, genre, language, year, access, page = 1, limit = 20 }) => {
  const query = { isActive: true };
  if (q) query.$text = { $search: q };
  if (type) query.type = type;
  if (genre) query.genre = genre;
  if (language) query.language = language;
  if (year) query.releaseYear = parseInt(year);
  if (access) query.access = access;

  const skip = (page - 1) * limit;
  const [results, total] = await Promise.all([
    Content.find(query)
      .sort(q ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Content.countDocuments(query),
  ]);

  return { results, total, page, pages: Math.ceil(total / limit) };
};

const getSuggestions = async (q, limit = 8) => {
  if (!q || q.length < 2) return [];
  const regex = new RegExp(q, 'i');
  return Content.find({ isActive: true, $or: [{ title: regex }, { tags: regex }] })
    .limit(limit)
    .select('title slug thumbnail type');
};

module.exports = { search, getSuggestions };
