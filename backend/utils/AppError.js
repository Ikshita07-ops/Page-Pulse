class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    // If status code starts with 4 (e.g., 400, 404), it's a client failure. Otherwise, it's a server error.
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    // Flag to identify expected/operational errors vs unknown programming bugs
    this.isOperational = true;

    // Capture the stack trace, excluding the constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
