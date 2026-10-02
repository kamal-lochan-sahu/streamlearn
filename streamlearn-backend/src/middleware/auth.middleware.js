const { verifyToken } = require('../utils/jwt.utils');
const { ApiError } = require('../utils/ApiError');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : req.cookies?.accessToken;
    if (!token) throw new ApiError(401, 'Access token required');

    const decoded = verifyToken(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id).select('-password -refreshToken');
    if (!user) throw new ApiError(401, 'User not found');
    if (!user.isActive) throw new ApiError(403, 'Account deactivated');

    req.user = user;
    next();
  } catch (err) {
    next(
      err.name === 'JsonWebTokenError'
        ? new ApiError(401, 'Invalid token')
        : err.name === 'TokenExpiredError'
          ? new ApiError(401, 'Token expired')
          : err
    );
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
      const decoded = verifyToken(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded._id).select('-password -refreshToken');
    }
  } catch {}
  next();
};

module.exports = { authenticate, optionalAuth };
