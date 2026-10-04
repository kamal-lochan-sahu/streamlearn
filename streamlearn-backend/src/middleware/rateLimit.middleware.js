const rateLimit = require('express-rate-limit');

// Automated tests hit the API from one IP in a tight loop.
const skip = () => process.env.NODE_ENV === 'test';

const tooMany = (message) => ({ success: false, message });

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: tooMany('Too many requests. Try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
  skip,
});

// Only FAILED logins count, so a shared IP (campus/office) is not locked out by successful logins.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: tooMany('Too many login attempts. Try again in 15 minutes.'),
  standardHeaders: true,
  legacyHeaders: false,
  skip,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  message: tooMany('Too many sign-ups from this network. Try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
  skip,
});

// Sending OTP / reset emails
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: tooMany('Too many requests. Try again in 15 minutes.'),
  standardHeaders: true,
  legacyHeaders: false,
  skip,
});

// Verifying OTP / reset tokens / changing password
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: tooMany('Too many attempts. Try again in 15 minutes.'),
  standardHeaders: true,
  legacyHeaders: false,
  skip,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: tooMany('Upload limit reached. Try again later.'),
  skip,
});

module.exports = {
  globalLimiter,
  loginLimiter,
  registerLimiter,
  otpLimiter,
  verifyLimiter,
  uploadLimiter,
};
