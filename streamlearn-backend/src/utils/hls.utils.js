const path = require('path');
const crypto = require('crypto');
const { ApiError } = require('./ApiError');

const generateSignedUrl = (url, expiresInSeconds = 14400) => {
  if (!url) throw new ApiError(404, 'No stream URL available');
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const token = crypto
    .createHmac('sha256', process.env.JWT_SECRET)
    .update(url + expiresAt)
    .digest('hex')
    .substring(0, 16);
  return `${url}?token=${token}&expires=${expiresAt}`;
};

const validateSignedUrl = (url, token, expires) => {
  if (Date.now() / 1000 > parseInt(expires)) return false;
  const expected = crypto
    .createHmac('sha256', process.env.JWT_SECRET)
    .update(url + expires)
    .digest('hex')
    .substring(0, 16);
  return expected === token;
};

module.exports = { generateSignedUrl, validateSignedUrl };
