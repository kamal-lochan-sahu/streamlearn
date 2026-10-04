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

module.exports = { requireString, normalizeEmail, requirePassword, MIN_PASSWORD };
