/**
 * Integration Tests: POST /api/audit
 * Covers full HTTP request/response pipeline via Supertest
 */
const request = require('supertest');
const app = require('../../app');
const auditService = require('../../services/auditService');
const { UnsupportedContentError, TimeoutError, FetchError } = require('../../utils/errors');

jest.mock('../../services/auditService');

describe('Integration Tests: POST /api/audit', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('1. Happy Path - returns 200 and audit object for valid URL', async () => {
    auditService.auditUrl.mockResolvedValue({
      url: 'https://example.com',
      hostname: 'example.com',
      httpStatus: 200,
      httpStatusText: 'OK',
      responseTimeMs: 120,
      hasBotProtection: false,
      pageTitle: 'Example Domain',
      metaDescription: null,
      h1Count: 1,
      imagesMissingAlt: 0,
      wordCount: 320,
      seoScore: 80,
      healthScore: 90,
      timestamp: new Date().toISOString(),
    });

    const res = await request(app).post('/api/audit').send({ url: 'https://example.com' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.url).toBe('https://example.com');
    expect(res.body.data.seoScore).toBe(80);
    expect(res.body.data.healthScore).toBe(90);
  });

  it('2. Invalid URL: abc - returns 400 Bad Request', async () => {
    const res = await request(app).post('/api/audit').send({ url: 'abc' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('fail');
    expect(res.body.message).toMatch(/Invalid URL/i);
  });

  it('3. Empty URL / Empty payload - returns 400 Bad Request', async () => {
    const res = await request(app).post('/api/audit').send({});

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('fail');
    expect(res.body.message).toMatch(/Invalid URL/i);
  });

  it('4. Timeout Error (10000ms exceeded) - returns 408 Request Timeout', async () => {
    const timeoutErr = new Error('timeout of 10000ms exceeded');
    timeoutErr.code = 'ECONNABORTED';
    auditService.auditUrl.mockRejectedValue(timeoutErr);

    const res = await request(app).post('/api/audit').send({ url: 'https://slow-website.com' });

    expect(res.status).toBe(408);
    expect(res.body.status).toBe('fail');
    expect(res.body.message).toMatch(/took too long to respond/i);
  });

  it('5. Unsupported Content-Type (PDF URL / Image URL) - returns 415 Unsupported Media Type', async () => {
    auditService.auditUrl.mockRejectedValue(
      new UnsupportedContentError('Target URL does not return HTML content.')
    );

    const res = await request(app).post('/api/audit').send({ url: 'https://example.com/document.pdf' });

    expect(res.status).toBe(415);
    expect(res.body.status).toBe('fail');
    expect(res.body.message).toMatch(/does not return HTML content/i);
  });

  it('6. Non-existent domain (ENOTFOUND / DNS Failure) - returns 400 Bad Request', async () => {
    const dnsErr = new Error('getaddrinfo ENOTFOUND invalid-domain-xyz.com');
    dnsErr.code = 'ENOTFOUND';
    auditService.auditUrl.mockRejectedValue(dnsErr);

    const res = await request(app).post('/api/audit').send({ url: 'https://invalid-domain-xyz.com' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('fail');
    expect(res.body.message).toMatch(/Could not resolve the host/i);
  });

  it('7. Flipkart / CAPTCHA Detection Audit Response - returns 200 with hasBotProtection: true', async () => {
    auditService.auditUrl.mockResolvedValue({
      url: 'https://www.flipkart.com',
      hostname: 'www.flipkart.com',
      httpStatus: 403,
      httpStatusText: 'Forbidden',
      responseTimeMs: 350,
      hasBotProtection: true,
      pageTitle: 'Access Denied - CAPTCHA Verification',
      metaDescription: null,
      h1Count: 0,
      imagesMissingAlt: 0,
      wordCount: 45,
      seoScore: 20,
      healthScore: 40,
      timestamp: new Date().toISOString(),
    });

    const res = await request(app).post('/api/audit').send({ url: 'https://www.flipkart.com' });

    expect(res.status).toBe(200);
    expect(res.body.data.hasBotProtection).toBe(true);
    expect(res.body.data.httpStatus).toBe(403);
  });

  it('8. Unexpected Server Error - returns 500 Internal Server Error', async () => {
    auditService.auditUrl.mockRejectedValue(new Error('Unexpected Crash'));

    const res = await request(app).post('/api/audit').send({ url: 'https://example.com' });

    expect(res.status).toBe(500);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe('Internal Server Error');
  });
});
