const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const generateAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

const generateRefreshToken = (payload) =>
  jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    algorithm: 'HS256',
    jwtid: crypto.randomUUID(), // unique per token, so two refreshes in the same second never match
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  });

const verifyToken = (token, secret, options = {}) =>
  jwt.verify(token, secret, { algorithms: ['HS256'], ...options });

const generateTokenPair = (user) => {
  const payload = { _id: user._id, role: user.role, email: user.email };
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

module.exports = { generateAccessToken, generateRefreshToken, verifyToken, generateTokenPair };
