const { AppError, TimeoutError, UnsupportedContentError, FetchError, ValidationError } = require('../utils/errors');

const errorHandler = (err, req, res, next) => {
  let error = err;

  // Map Axios network errors to our Custom Errors
  if (err.code === 'ECONNABORTED' || (err.message && err.message.includes('timeout'))) {
    error = new TimeoutError('Request Timeout: The target website took too long to respond.');
  } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || (err.message && err.message.includes('getaddrinfo'))) {
    error = new FetchError('DNS or Connection Failure: Could not resolve the host or connection refused.', 400);
  }

  const statusCode = error.statusCode || 500;
  const message = error.isOperational ? error.message : 'Internal Server Error';

  res.status(statusCode).json({
    status: error.status || 'error',
    message
  });
};

module.exports = errorHandler;
