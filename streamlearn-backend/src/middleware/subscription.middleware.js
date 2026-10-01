const { ApiError } = require('../utils/ApiError');

const requireSubscription = (req, res, next) => {
  const sub = req.user?.subscription;
  if (!sub || sub.status !== 'active' || new Date(sub.endDate) < new Date())
    return next(new ApiError(403, 'Active subscription required'));
  next();
};

const canAccessContent = (req, res, next) => {
  const content = req.content;
  if (!content) return next();
  if (content.access === 'free') return next();
  if (content.access === 'subscribers') return requireSubscription(req, res, next);
  if (content.access === 'ppv') {
    // TODO: check if user purchased this content
    return next();
  }
  next();
};

module.exports = { requireSubscription, canAccessContent };
