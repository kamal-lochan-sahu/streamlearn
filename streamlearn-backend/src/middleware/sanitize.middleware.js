const { ApiError } = require('../utils/ApiError');
const { findDangerousKey } = require('../utils/query.utils');

/**
 * Defence in depth against NoSQL operator injection: no request may carry a key that starts with `$`
 * (like { "$gt": "" } or ?email[$ne]=x) in its query string or JSON/form body. Controllers still
 * validate every field they use; this makes a missed check harmless.
 * Webhook routes use raw bodies (not parsed objects), so they are not affected.
 */
const rejectOperatorKeys = (req, res, next) => {
  const bad = findDangerousKey(req.query) || findDangerousKey(req.body);
  if (bad) return next(new ApiError(400, 'Invalid request: unsupported field name'));
  next();
};

module.exports = { rejectOperatorKeys };
