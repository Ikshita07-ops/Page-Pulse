/**
 * Unit Tests: Centralized Error Handler Middleware
 * Covers: ECONNABORTED (timeout), ENOTFOUND (DNS), Custom AppError, operational vs non-operational errors
 */
const errorHandler = require('../../middleware/errorHandler');
const { ValidationError, TimeoutError, FetchError } = require('../../utils/errors');

describe('Error Handler Middleware Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it('maps ECONNABORTED network error to 408 TimeoutError', () => {
    const err = new Error('timeout of 10000ms exceeded');
    err.code = 'ECONNABORTED';

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(408);
    expect(res.json).toHaveBeenCalledWith({
      status: 'fail',
      message: expect.stringMatching(/took too long to respond/i),
    });
  });

  it('maps ENOTFOUND network error to FetchError (400 Bad Request)', () => {
    const err = new Error('getaddrinfo ENOTFOUND nonexistent.com');
    err.code = 'ENOTFOUND';

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 'fail',
      message: expect.stringMatching(/Could not resolve the host/i),
    });
  });

  it('handles custom operational ValidationError correctly with 400 status', () => {
    const err = new ValidationError('Invalid URL provided.');

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 'fail',
      message: 'Invalid URL provided.',
    });
  });

  it('hides message and returns 500 status for non-operational / unexpected errors', () => {
    const err = new Error('Database connection crashed');

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Internal Server Error',
    });
  });
});
