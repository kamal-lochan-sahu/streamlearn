const { ApiError } = require('../utils/ApiError');

/** Turns Mongoose / body-parser / driver errors into a clean 4xx instead of a bare 500. */
const normalizeError = (err) => {
  if (err instanceof ApiError) return err;
  if (err?.name === 'CastError') return new ApiError(400, 'Invalid id or value');
  if (err?.name === 'ValidationError') {
    const first = Object.values(err.errors || {})[0];
    return new ApiError(400, first?.message || 'Validation failed');
  }
  if (err?.code === 11000) return new ApiError(409, 'Already exists');
  if (err?.type === 'entity.too.large') return new ApiError(413, 'Request body too large');
  if (err?.type === 'entity.parse.failed') return new ApiError(400, 'Invalid JSON');
  const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
  // Never leak internal messages (stack details, DB errors) from unexpected 500s in production.
  const hide = statusCode >= 500 && process.env.NODE_ENV === 'production';
  return new ApiError(
    statusCode,
    hide ? 'Something went wrong' : err?.message || 'Something went wrong',
    hide ? [] : err?.errors || []
  );
};

const errorHandler = (err, req, res, next) => {
  const error = normalizeError(err);
  if (process.env.NODE_ENV === 'development' || error.statusCode >= 500)
    console.error('ERROR:', req.method, req.originalUrl, err);

  const response = {
    success: false,
    message: error.message,
    ...(error.errors?.length && { errors: error.errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  };
  res.status(error.statusCode).json(response);
};

module.exports = { errorHandler };
