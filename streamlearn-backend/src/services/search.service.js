const Content = require('../models/Content');
const {
  escapeRegex,
  queryString,
  queryEnum,
  queryList,
  queryInt,
  pageParams,
  parseSort,
} = require('../utils/query.utils');

/** Fields that are safe to show in any list (never video files, owner or internal flags). */
const LIST_FIELDS =
  'title slug thumbnail banner shortDesc type genre language releaseYear duration rating viewCount access price isFeatured ageRating';

const ACCESS_VALUES = ['free', 'subscribers', 'ppv'];
const contentTypes = () => Content.schema.path('type').enumValues;

/** Public sort names -> Mongo sort. Anything else falls back to newest first. */
const BROWSE_SORTS = {
  '-createdAt': { createdAt: -1 },
  createdAt: { createdAt: 1 },
  '-viewCount': { viewCount: -1, createdAt: -1 },
  '-rating.average': { 'rating.average': -1, createdAt: -1 },
  title: { title: 1 },
  '-title': { title: -1 },
  '-releaseYear': { releaseYear: -1, createdAt: -1 },
  releaseYear: { releaseYear: 1, createdAt: -1 },
};
const DEFAULT_SORT = BROWSE_SORTS['-createdAt'];

/** Active, already published and not expired. Same rule as access.service `isPublished`. */
const publishedFilter = (now = new Date()) => ({
  isActive: true,
  $and: [
    { $or: [{ expiryDate: null }, { expiryDate: { $gt: now } }] },
    { $or: [{ schedulePublish: null }, { schedulePublish: { $lte: now } }] },
  ],
});

/**
 * Turns untrusted browse/search input (query string or JSON body) into a clean filter.
 * Throws 400 for objects, wrong types and unknown enum values.
 */
const parseCatalogInput = (input = {}) => {
  const q = queryString(input.q, 'Search text', 100);
  const type = queryEnum(input.type, contentTypes(), 'type');
  const access = queryEnum(input.access, ACCESS_VALUES, 'access');
  const genre = queryList(input.genre, 'genre');
  const language = queryList(input.language, 'language');
  const year = queryInt(input.year, 'year', 1888, 2100);
  const { page, limit, skip } = pageParams(input);
  const sort = parseSort(input.sort, BROWSE_SORTS, DEFAULT_SORT);
  const sortKey = sort === DEFAULT_SORT ? '-createdAt' : input.sort;
  return { q, type, access, genre, language, year, page, limit, skip, sort, sortKey };
};

const buildCatalogQuery = (params) => {
  const query = publishedFilter();
  if (params.q) query.$text = { $search: params.q };
  if (params.type) query.type = params.type;
  if (params.access) query.access = params.access;
  if (params.genre) query.genre = { $in: params.genre };
  if (params.language) query.language = { $in: params.language };
  if (params.year) query.releaseYear = params.year;
  return query;
};

/** Stable cache key built from the CLEAN params only (so junk query strings cannot fill Redis). */
const catalogCacheKey = (prefix, params) =>
  `${prefix}:${JSON.stringify([
    params.type,
    params.access,
    params.genre && [...params.genre].sort(),
    params.language && [...params.language].sort(),
    params.year,
    params.page,
    params.limit,
    params.sortKey,
  ])}`;

const LIST_PROJECTION = Object.fromEntries(LIST_FIELDS.split(' ').map((field) => [field, 1]));

const runCatalogQuery = async (params) => {
  const query = buildCatalogQuery(params);
  // With a text query: rank by relevance (the score is projected only for sorting)
  const projection = params.q
    ? { ...LIST_PROJECTION, score: { $meta: 'textScore' } }
    : LIST_PROJECTION;
  const sort = params.q ? { score: { $meta: 'textScore' } } : params.sort;
  const [results, total] = await Promise.all([
    Content.find(query, projection).sort(sort).skip(params.skip).limit(params.limit),
    Content.countDocuments(query),
  ]);
  return { results, total, page: params.page, pages: Math.ceil(total / params.limit) };
};

/** Full text search + filters. `input` is untrusted (req.query or req.body). */
const search = async (input) => runCatalogQuery(parseCatalogInput(input));

/** Title/tag autocomplete. The text is escaped, so it is matched literally. */
const getSuggestions = async (value, limit = 8) => {
  const q = queryString(value, 'Search text', 50);
  if (!q || q.length < 2) return [];
  const regex = new RegExp(escapeRegex(q), 'i');
  return Content.find({ ...publishedFilter(), $or: [{ title: regex }, { tags: regex }] })
    .limit(limit)
    .select('title slug thumbnail type');
};

module.exports = {
  search,
  getSuggestions,
  parseCatalogInput,
  buildCatalogQuery,
  catalogCacheKey,
  publishedFilter,
  LIST_FIELDS,
  BROWSE_SORTS,
  DEFAULT_SORT,
};
