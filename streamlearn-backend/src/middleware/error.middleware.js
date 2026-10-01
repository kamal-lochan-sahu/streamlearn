const { ApiError } = require('../utils/ApiError');

const errorHandler = (err, req, res, next) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    const statusCode = err.statusCode || 500;
    const message    = err.message || 'Something went wrong';
    error = new ApiError(statusCode, message, err?.errors || []);
  }
  if (process.env.NODE_ENV === 'development') console.error('ERROR:', err);

  const response = {
    success: false,
    message: error.message,
    ...(error.errors?.length && { errors: error.errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  };
  res.status(error.statusCode).json(response);
};

module.exports = { errorHandler };
