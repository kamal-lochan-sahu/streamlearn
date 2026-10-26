const { ApiError } = require('./ApiError');
const { clampInt } = require('./validate.utils');

/** Escape user text so it can sit inside a RegExp as plain characters (no ReDoS, no crash). */
const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Optional text query value. Rejects objects/arrays such as ?q[$ne]=x. Returns undefined when absent. */
const queryString = (value, label, max = 100) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new ApiError(400, `${label} must be text`);
  const text = value.trim();
  if (!text) return undefined;
  if (text.length > max) throw new ApiError(400, `${label} is too long (max ${max})`);
  return text;
};

/** Optional value that must be one of `allowed`. */
const queryEnum = (value, allowed, label) => {
  const text = queryString(value, label, 40);
  if (text === undefined) return undefined;
  if (!allowed.includes(text)) throw new ApiError(400, `Invalid ${label}`);
  return text;
};

/** Optional list: one string or an array of strings (?genre=a&genre=b or genre[]=a). */
const queryList = (value, label, { maxItems = 10, maxLength = 50 } = {}) => {
  if (value === undefined || value === null || value === '') return undefined;
  const items = Array.isArray(value) ? value : [value];
  if (items.length > maxItems)
    throw new ApiError(400, `Too many ${label} values (max ${maxItems})`);
  const out = items
    .map((item) => queryString(item, label, maxLength))
    .filter((item) => item !== undefined);
  return out.length ? out : undefined;
};

/** Optional whole number inside [min, max]. */
const queryInt = (value, label, min, max) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' && typeof value !== 'number')
    throw new ApiError(400, `${label} must be a number`);
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max)
    throw new ApiError(400, `${label} must be a whole number between ${min} and ${max}`);
  return n;
};

/** page + limit with safe bounds (never throws: bad values fall back to the defaults). */
const pageParams = (source, { defaultLimit = 20, maxLimit = 50 } = {}) => {
  const page = clampInt(typeof source?.page === 'object' ? NaN : source?.page, 1, 1, 1000);
  const limit = clampInt(
    typeof source?.limit === 'object' ? NaN : source?.limit,
    defaultLimit,
    1,
    maxLimit
  );
  return { page, limit, skip: (page - 1) * limit };
};

/** Maps a public sort name to a Mongo sort. Anything not listed falls back to the default. */
const parseSort = (value, allowed, fallback) => {
  if (typeof value !== 'string') return fallback;
  return Object.prototype.hasOwnProperty.call(allowed, value) ? allowed[value] : fallback;
};

/** True when a key looks like a Mongo operator ($gt, $where ...) or a prototype trick. */
const isDangerousKey = (key) => key.startsWith('$') || key === '__proto__';

/** Walks plain objects/arrays and returns the first dangerous key found (or null). */
const findDangerousKey = (value, depth = 0) => {
  if (value === null || typeof value !== 'object') return null;
  // Raw bodies (payment webhooks) are Buffers: nothing to inspect, and iterating their bytes would be slow
  if (Buffer.isBuffer(value)) return null;
  if (depth > 12) return '(too deeply nested)';
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findDangerousKey(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  for (const key of Object.keys(value)) {
    if (isDangerousKey(key)) return key;
    const found = findDangerousKey(value[key], depth + 1);
    if (found) return found;
  }
  return null;
};

module.exports = {
  escapeRegex,
  queryString,
  queryEnum,
  queryList,
  queryInt,
  pageParams,
  parseSort,
  findDangerousKey,
};
