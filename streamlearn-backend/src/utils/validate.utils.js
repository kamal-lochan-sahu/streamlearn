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

module.exports = {
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
