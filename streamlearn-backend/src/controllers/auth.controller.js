const crypto = require('crypto');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { generateTokenPair, verifyToken } = require('../utils/jwt.utils');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendWelcomeEmail, sendOTPEmail, sendPasswordResetEmail } = require('../utils/email.utils');

// ── Helpers
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendTokens = (res, user, statusCode = 200, message = 'Success') => {
  const { accessToken, refreshToken } = generateTokenPair(user);
  user.refreshToken = refreshToken;
  user.save({ validateBeforeSave: false });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
  res.cookie('refreshToken', refreshToken, cookieOptions);
  res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });

  res.status(statusCode).json(
    new ApiResponse(
      statusCode,
      {
        user: user.toSafeObject(),
        accessToken,
        refreshToken,
      },
      message
    )
  );
};

// ── Register
exports.register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password) throw new ApiError(400, 'Name, email and password required');

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'Email already registered');

  const user = await User.create({ name, email, phone, password });
  user.profiles[0].name = name;
  await user.save();

  // Create default settings for first owner
  const ownerCount = await User.countDocuments({ role: 'owner' });
  if (ownerCount === 0) user.role = 'owner';
  await user.save();

  sendWelcomeEmail(user).catch(console.error);
  sendTokens(res, user, 201, 'Registration successful');
});

// ── Login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password required');

  const user = await User.findOne({ email }).select('+password');
  if (!user) throw new ApiError(401, 'Invalid credentials');
  if (!user.isActive) throw new ApiError(403, 'Account deactivated. Contact support.');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new ApiError(401, 'Invalid credentials');

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokens(res, user, 200, 'Login successful');
});

// ── Logout
exports.logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: '' });
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json(new ApiResponse(200, {}, 'Logged out'));
});

// ── Refresh Token
exports.refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body.refreshToken;
  if (!token) throw new ApiError(401, 'Refresh token required');

  const decoded = verifyToken(token, process.env.REFRESH_TOKEN_SECRET);
  const user = await User.findById(decoded._id);
  if (!user || user.refreshToken !== token) throw new ApiError(401, 'Invalid refresh token');

  sendTokens(res, user, 200, 'Tokens refreshed');
});

// ── Send OTP
exports.sendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'Email required');

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, 'User not found');

  const otp = generateOTP();
  user.otp = { code: otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) };
  await user.save({ validateBeforeSave: false });

  await sendOTPEmail(email, otp);
  res.json(new ApiResponse(200, {}, 'OTP sent to your email'));
});

// ── Verify OTP
exports.verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) throw new ApiError(400, 'Email and OTP required');

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, 'User not found');
  if (!user.otp?.code || user.otp.code !== otp) throw new ApiError(400, 'Invalid OTP');
  if (new Date() > user.otp.expiresAt) throw new ApiError(400, 'OTP expired');

  user.isVerified = true;
  user.otp = undefined;
  await user.save({ validateBeforeSave: false });

  sendTokens(res, user, 200, 'OTP verified');
});

// ── Forgot Password
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, 'No account with that email');

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  await sendPasswordResetEmail(email, resetUrl);
  res.json(new ApiResponse(200, {}, 'Reset link sent to your email'));
});

// ── Reset Password
exports.resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  if (!password) throw new ApiError(400, 'New password required');

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });
  if (!user) throw new ApiError(400, 'Reset token invalid or expired');

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  sendTokens(res, user, 200, 'Password reset successful');
});

// ── Change Password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword)))
    throw new ApiError(400, 'Current password incorrect');
  user.password = newPassword;
  await user.save();
  res.json(new ApiResponse(200, {}, 'Password changed'));
});

// ── Google OAuth callback
exports.googleCallback = asyncHandler(async (req, res) => {
  sendTokens(res, req.user, 200, 'Google login successful');
});
