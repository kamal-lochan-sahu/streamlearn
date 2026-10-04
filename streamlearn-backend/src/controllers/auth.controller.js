const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateTokenPair, verifyToken } = require('../utils/jwt.utils');
const {
  sha256,
  safeEqualHex,
  refreshCookieOptions,
  REFRESH_COOKIE_MAX_AGE,
  generateOTP,
  randomToken,
} = require('../utils/authTokens');
const { requireString, normalizeEmail, requirePassword } = require('../utils/validate.utils');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendWelcomeEmail, sendOTPEmail, sendPasswordResetEmail } = require('../utils/email.utils');

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCK_MS = 15 * 60 * 1000;
const OAUTH_CODE_TTL_MS = 60 * 1000;

// ── Helpers

const clientUrl = () => (process.env.CLIENT_URL || '').replace(/\/+$/, '');

/** Browsers always send Origin on cross-site POSTs. Reject anything that is not our frontend. */
const assertTrustedOrigin = (req) => {
  const origin = req.headers.origin;
  if (origin && origin.replace(/\/+$/, '') !== clientUrl())
    throw new ApiError(403, 'Untrusted origin');
};

/**
 * Starts a session: rotates the refresh token (stored hashed), sets the refresh cookie,
 * and returns the access token in the body. The refresh token is never exposed to JS.
 */
const issueSession = async (res, user, statusCode = 200, message = 'Success') => {
  const { accessToken, refreshToken } = generateTokenPair(user);
  user.refreshToken = sha256(refreshToken);
  await user.save({ validateBeforeSave: false });

  res.cookie('refreshToken', refreshToken, {
    ...refreshCookieOptions(),
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
  res
    .status(statusCode)
    .json(new ApiResponse(statusCode, { user: user.toSafeObject(), accessToken }, message));
};

const clearRefreshCookie = (res) => {
  res.clearCookie('refreshToken', refreshCookieOptions());
  res.clearCookie('refreshToken', { path: '/' }); // cookie from before the path change
  res.clearCookie('accessToken', { path: '/' }); // legacy cookie, no longer used
};

// bcrypt takes the same time whether or not the account exists (no timing-based user discovery)
let dummyHash;
const burnPasswordCheck = async (password) => {
  dummyHash = dummyHash || bcrypt.hashSync('not-a-real-password', 12);
  await bcrypt.compare(password, dummyHash);
};

// ── Register
exports.register = asyncHandler(async (req, res) => {
  const name = requireString(req.body.name, 'Name').slice(0, 80);
  const email = normalizeEmail(req.body.email);
  const password = requirePassword(req.body.password);
  const phone = typeof req.body.phone === 'string' ? req.body.phone.trim().slice(0, 20) : '';

  if (await User.findOne({ email })) throw new ApiError(409, 'Email already registered');

  let user;
  try {
    // role is never taken from the request; every public sign-up is a viewer.
    // Owners are created with `npm run create-owner` (see scripts/create-owner.js).
    user = await User.create({ name, email, phone, password });
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, 'Email already registered');
    throw err;
  }

  sendWelcomeEmail(user).catch(console.error);
  await issueSession(res, user, 201, 'Registration successful');
});

// ── Login
exports.login = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (typeof req.body.password !== 'string' || !req.body.password)
    throw new ApiError(400, 'Password required');

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    await burnPasswordCheck(req.body.password);
    throw new ApiError(401, 'Invalid credentials');
  }
  if (!(await user.comparePassword(req.body.password)))
    throw new ApiError(401, 'Invalid credentials');
  if (!user.isActive) throw new ApiError(403, 'Account deactivated. Contact support.');

  user.lastLogin = new Date();
  await issueSession(res, user, 200, 'Login successful');
});

// ── Logout (works even when the access token has already expired)
exports.logout = asyncHandler(async (req, res) => {
  assertTrustedOrigin(req);
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const decoded = verifyToken(token, process.env.REFRESH_TOKEN_SECRET, {
        ignoreExpiration: true,
      });
      await User.updateOne(
        { _id: decoded._id, refreshToken: sha256(token) },
        { $unset: { refreshToken: 1 } }
      );
    } catch {
      // invalid cookie: nothing to revoke
    }
  }
  clearRefreshCookie(res);
  res.json(new ApiResponse(200, {}, 'Logged out'));
});

// ── Refresh token (cookie only; rotates the refresh token on every use)
exports.refreshToken = asyncHandler(async (req, res) => {
  assertTrustedOrigin(req);
  const token = req.cookies?.refreshToken;
  if (!token) throw new ApiError(401, 'Refresh token required');

  let decoded;
  try {
    decoded = verifyToken(token, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    throw new ApiError(401, 'Invalid refresh token');
  }

  const user = await User.findById(decoded._id);
  if (!user || !user.refreshToken || !safeEqualHex(user.refreshToken, sha256(token)))
    throw new ApiError(401, 'Invalid refresh token');
  if (!user.isActive) throw new ApiError(403, 'Account deactivated');

  await issueSession(res, user, 200, 'Tokens refreshed');
});

// ── Send OTP
exports.sendOTP = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  // Same answer whether or not the account exists (no account discovery)
  const reply = () => res.json(new ApiResponse(200, {}, 'If the account exists, an OTP was sent'));

  const user = await User.findOne({ email });
  if (!user || !user.isActive) return reply();

  const now = Date.now();
  if (user.otp?.lockedUntil && user.otp.lockedUntil.getTime() > now)
    throw new ApiError(429, 'Too many wrong attempts. Try again later.');
  if (user.otp?.sentAt && now - user.otp.sentAt.getTime() < OTP_RESEND_COOLDOWN_MS)
    throw new ApiError(429, 'Please wait a minute before requesting another OTP.');

  const otp = generateOTP();
  user.otp = {
    codeHash: sha256(`${user._id}:${otp}`),
    expiresAt: new Date(now + OTP_TTL_MS),
    attempts: 0,
    sentAt: new Date(now),
  };
  await user.save({ validateBeforeSave: false });

  try {
    await sendOTPEmail(email, otp);
  } catch (err) {
    console.error('OTP email failed:', err.message);
  }
  reply();
});

// ── Verify OTP (max 5 guesses per code, then locked for 15 minutes)
exports.verifyOTP = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const otp = String(req.body.otp ?? '').trim();
  if (!/^\d{6}$/.test(otp)) throw new ApiError(400, 'Invalid OTP');

  const invalid = () => new ApiError(400, 'Invalid or expired OTP');
  const locked = () => new ApiError(429, 'Too many wrong attempts. Try again later.');

  const user = await User.findOne({ email });
  if (!user || !user.isActive) throw invalid();

  const now = Date.now();
  if (user.otp?.lockedUntil && user.otp.lockedUntil.getTime() > now) throw locked();
  if (!user.otp?.codeHash || !user.otp.expiresAt || user.otp.expiresAt.getTime() < now)
    throw invalid();

  // Count the attempt atomically BEFORE comparing, so parallel guesses cannot beat the limit.
  const counted = await User.findOneAndUpdate(
    { _id: user._id, 'otp.codeHash': user.otp.codeHash, 'otp.attempts': { $lt: OTP_MAX_ATTEMPTS } },
    { $inc: { 'otp.attempts': 1 } },
    { new: true }
  );
  if (!counted) {
    await User.updateOne(
      { _id: user._id },
      { $set: { otp: { attempts: 0, lockedUntil: new Date(now + OTP_LOCK_MS) } } }
    );
    throw locked();
  }

  if (!safeEqualHex(counted.otp.codeHash, sha256(`${user._id}:${otp}`))) {
    if (counted.otp.attempts >= OTP_MAX_ATTEMPTS) {
      await User.updateOne(
        { _id: user._id },
        { $set: { otp: { attempts: 0, lockedUntil: new Date(now + OTP_LOCK_MS) } } }
      );
      throw locked();
    }
    throw invalid();
  }

  counted.isVerified = true;
  counted.otp = undefined;
  await issueSession(res, counted, 200, 'OTP verified');
});

// ── Forgot Password
exports.forgotPassword = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const reply = () =>
    res.json(new ApiResponse(200, {}, 'If the account exists, a reset link was sent'));

  const user = await User.findOne({ email });
  if (!user || !user.isActive) return reply();

  // A reset link was created less than a minute ago: do not send another email.
  if (
    user.resetPasswordExpires &&
    user.resetPasswordExpires.getTime() > Date.now() + 59 * 60 * 1000
  )
    return reply();

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = sha256(resetToken);
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  try {
    await sendPasswordResetEmail(email, `${clientUrl()}/reset-password/${resetToken}`);
  } catch (err) {
    console.error('Reset email failed:', err.message);
  }
  reply();
});

// ── Reset Password
exports.resetPassword = asyncHandler(async (req, res) => {
  const token = requireString(req.params.token, 'Token');
  const password = requirePassword(req.body.password, 'New password');

  const user = await User.findOne({
    resetPasswordToken: sha256(token),
    resetPasswordExpires: { $gt: new Date() },
  });
  if (!user) throw new ApiError(400, 'Reset token invalid or expired');

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.otp = undefined;
  await user.save(); // hashes the password
  await issueSession(res, user, 200, 'Password reset successful'); // replaces every older session
});

// ── Change Password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword } = req.body;
  if (typeof currentPassword !== 'string' || !currentPassword)
    throw new ApiError(400, 'Current password required');
  const newPassword = requirePassword(req.body.newPassword, 'New password');
  if (newPassword === currentPassword)
    throw new ApiError(400, 'New password must be different from the current one');

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword)))
    throw new ApiError(400, 'Current password incorrect');

  user.password = newPassword;
  await user.save();
  await issueSession(res, user, 200, 'Password changed'); // other devices are signed out
});

// ── Google OAuth
// The callback never returns tokens in the URL. It redirects the browser to the frontend with a
// one-time code (valid 60s, single use) which the frontend swaps for a session.
exports.googleCallback = asyncHandler(async (req, res) => {
  const code = randomToken(32);
  await User.updateOne(
    { _id: req.user._id },
    {
      $set: {
        oauthCode: { hash: sha256(code), expiresAt: new Date(Date.now() + OAUTH_CODE_TTL_MS) },
      },
    }
  );
  res.redirect(`${clientUrl()}/auth/callback?code=${code}`);
});

exports.googleExchange = asyncHandler(async (req, res) => {
  assertTrustedOrigin(req);
  const code = requireString(req.body.code, 'Code');
  if (!/^[a-f0-9]{64}$/.test(code)) throw new ApiError(400, 'Invalid or expired code');

  // findOneAndUpdate is atomic: a code can be redeemed exactly once
  const user = await User.findOneAndUpdate(
    { 'oauthCode.hash': sha256(code), 'oauthCode.expiresAt': { $gt: new Date() } },
    { $unset: { oauthCode: 1 } },
    { new: true }
  );
  if (!user) throw new ApiError(400, 'Invalid or expired code');
  if (!user.isActive) throw new ApiError(403, 'Account deactivated');

  user.lastLogin = new Date();
  await issueSession(res, user, 200, 'Google login successful');
});
