class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message || 'Invalid input provided.', 400);
  }
}

class TimeoutError extends AppError {
  constructor(message) {
    super(message || 'The request timed out.', 408);
  }
}

class UnsupportedContentError extends AppError {
  constructor(message) {
    super(message || 'Unsupported media type.', 415);
  }
}

class FetchError extends AppError {
  constructor(message, statusCode = 502) {
    super(message || 'Failed to fetch the target URL.', statusCode);
  }
}

class ParsingError extends AppError {
  constructor(message) {
    super(message || 'Failed to parse the content.', 500);
  }
}

module.exports = {
  AppError,
  ValidationError,
  TimeoutError,
  UnsupportedContentError,
  FetchError,
  ParsingError
};
