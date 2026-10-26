const { ApiError } = require('./ApiError');

/** Returns a trimmed string, or throws 400. Blocks objects like { $gt: '' } (NoSQL injection). */
const requireString = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new ApiError(400, `${label} required`);
  return value.trim();
};

const normalizeEmail = (value) => {
  const email = requireString(value, 'Email').toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new ApiError(400, 'Invalid email');
  return email;
};

const MIN_PASSWORD = 8;
const requirePassword = (value, label = 'Password') => {
  if (typeof value !== 'string' || !value) throw new ApiError(400, `${label} required`);
  if (value.length < MIN_PASSWORD)
    throw new ApiError(400, `${label} must be at least ${MIN_PASSWORD} characters`);
  if (value.length > 128) throw new ApiError(400, `${label} is too long`);
  return value;
};

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const isObjectId = (value) => typeof value === 'string' && OBJECT_ID.test(value);

/** Returns the id string, or throws 400. Also blocks objects like { $ne: '' } and path tricks. */
const requireObjectId = (value, label = 'Id') => {
  if (!isObjectId(value)) throw new ApiError(400, `Invalid ${label}`);
  return value;
};

/** Optional string with a maximum length. Returns undefined when absent. */
const optionalString = (value, label, max) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new ApiError(400, `${label} must be text`);
  if (value.length > max) throw new ApiError(400, `${label} is too long (max ${max})`);
  return value.trim();
};

const requireText = (value, label, max) => {
  const text = requireString(value, label);
  if (text.length > max) throw new ApiError(400, `${label} is too long (max ${max})`);
  return text;
};

/** http(s) URL only (blocks javascript: and data: links that would end up in an <a href>). */
const requireHttpUrl = (value, label = 'URL') => {
  const raw = requireString(value, label);
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new ApiError(400, `Invalid ${label}`);
  }
  if (!['http:', 'https:'].includes(url.protocol) || raw.length > 1000)
    throw new ApiError(400, `Invalid ${label}`);
  return raw;
};

/** Copy of obj without the given keys (used to keep server-managed fields out of updates). */
const omitKeys = (obj, keys) => {
  const out = { ...(obj && typeof obj === 'object' ? obj : {}) };
  for (const key of keys) delete out[key];
  return out;
};

const clampInt = (value, fallback, min, max) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
};

/** true/false only (also accepts the strings "true"/"false" from forms). Undefined when absent. */
const optionalBoolean = (value, label) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new ApiError(400, `${label} must be true or false`);
};

/** Whole number in [min, max] (numbers or numeric strings). Undefined when absent. */
const optionalInt = (value, label, min, max) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'number' && typeof value !== 'string')
    throw new ApiError(400, `${label} must be a number`);
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max)
    throw new ApiError(400, `${label} must be a whole number between ${min} and ${max}`);
  return n;
};

/** Number (decimals allowed) in [min, max]. Undefined when absent. */
const optionalNumber = (value, label, min, max) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'number' && typeof value !== 'string')
    throw new ApiError(400, `${label} must be a number`);
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max)
    throw new ApiError(400, `${label} must be between ${min} and ${max}`);
  return n;
};

/** One of the allowed values. Undefined when absent. */
const optionalEnum = (value, allowed, label) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !allowed.includes(value))
    throw new ApiError(400, `${label} must be one of: ${allowed.join(', ')}`);
  return value;
};

/** Array of short strings (genres, languages ...). Undefined when absent. */
const optionalStringList = (value, label, { maxItems = 20, maxLength = 40 } = {}) => {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new ApiError(400, `${label} must be a list`);
  if (value.length > maxItems)
    throw new ApiError(400, `${label}: too many items (max ${maxItems})`);
  return value.map((item) => {
    if (typeof item !== 'string' || !item.trim() || item.length > maxLength)
      throw new ApiError(400, `${label}: every item must be short text`);
    return item.trim();
  });
};

/** Array position from a URL part like "2". Throws 400 for "abc", "-1", "1.5". */
const parseIndex = (value, label = 'Index') => {
  if (typeof value !== 'string' || !/^\d{1,3}$/.test(value))
    throw new ApiError(400, `Invalid ${label}`);
  return Number(value);
};

module.exports = {
  optionalBoolean,
  optionalInt,
  optionalNumber,
  optionalEnum,
  optionalStringList,
  parseIndex,
  requireString,
  normalizeEmail,
  requirePassword,
  MIN_PASSWORD,
  isObjectId,
  requireObjectId,
  optionalString,
  requireText,
  requireHttpUrl,
  omitKeys,
  clampInt,
};
