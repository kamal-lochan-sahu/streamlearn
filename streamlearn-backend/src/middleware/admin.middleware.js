const { ApiError } = require('../utils/ApiError');

const isAdmin = (req, res, next) => {
  if (!['owner', 'admin'].includes(req.user?.role))
    return next(new ApiError(403, 'Admin access required'));
  next();
};

const isOwner = (req, res, next) => {
  if (req.user?.role !== 'owner') return next(new ApiError(403, 'Owner access required'));
  next();
};

const isCreator = (req, res, next) => {
  if (!['owner', 'admin', 'creator'].includes(req.user?.role))
    return next(new ApiError(403, 'Creator access required'));
  next();
};

const hasRole =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user?.role))
      return next(new ApiError(403, `Required role: ${roles.join(' or ')}`));
    next();
  };

module.exports = { isAdmin, isOwner, isCreator, hasRole };
