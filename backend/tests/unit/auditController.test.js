/**
 * Unit Tests: Audit Controller
 * Covers: input validation triggering, service invocation, error passing to next()
 */
const auditController = require('../../controllers/auditController');
const auditService = require('../../services/auditService');
const { ValidationError } = require('../../utils/errors');

jest.mock('../../services/auditService');

describe('Audit Controller Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('throws ValidationError and passes to next() if URL is missing', async () => {
    req.body = {};

    await auditController.audit(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    expect(auditService.auditUrl).not.toHaveBeenCalled();
  });

  it('throws ValidationError and passes to next() if URL is invalid', async () => {
    req.body = { url: 'abc' };

    await auditController.audit(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    expect(auditService.auditUrl).not.toHaveBeenCalled();
  });

  it('calls auditService and returns 200 with result data on success', async () => {
    req.body = { url: 'https://example.com' };
    const mockAuditData = { url: 'https://example.com', seoScore: 90, healthScore: 95 };
    auditService.auditUrl.mockResolvedValueOnce(mockAuditData);

    await auditController.audit(req, res, next);

    expect(auditService.auditUrl).toHaveBeenCalledWith('https://example.com');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: mockAuditData,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('passes service errors to next()', async () => {
    req.body = { url: 'https://example.com' };
    const mockError = new Error('Service Failure');
    auditService.auditUrl.mockRejectedValueOnce(mockError);

    await auditController.audit(req, res, next);

    expect(next).toHaveBeenCalledWith(mockError);
  });
});
