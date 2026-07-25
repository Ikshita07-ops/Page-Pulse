/**
 * Unit Tests: Audit Service
 * Covers: HTML Parser, SEO Score, Health Score, Bot/CAPTCHA Detection, Response Validation, Status Mapping
 */
const cheerio = require('cheerio');
const {
  extractTitle,
  extractMetaDescription,
  countH1,
  countMissingAltImages,
  calculateApproximateWordCount,
  validateHtmlResponse,
  detectBotProtection,
  getStatusText,
  calculateSeoScore,
  calculateHealthScore,
  auditUrl,
} = require('../../services/auditService');
const { UnsupportedContentError, ParsingError } = require('../../utils/errors');

jest.mock('axios');
const axios = require('axios');

describe('Audit Service Unit Tests', () => {
  // ─────────────────────────────────────────
  // 1. HTML Parser Helper Tests
  // ─────────────────────────────────────────
  describe('HTML Parser Helpers', () => {
    describe('extractTitle', () => {
      it('returns the title text when a <title> tag exists', () => {
        const $ = cheerio.load('<title>  Page Title Test  </title>');
        expect(extractTitle($)).toBe('Page Title Test');
      });

      it('returns null when no <title> tag exists', () => {
        const $ = cheerio.load('<html><head></head></html>');
        expect(extractTitle($)).toBeNull();
      });
    });

    describe('extractMetaDescription', () => {
      it('returns meta description content when present', () => {
        const $ = cheerio.load('<meta name="description" content="SEO description here">');
        expect(extractMetaDescription($)).toBe('SEO description here');
      });

      it('returns null when meta description is missing', () => {
        const $ = cheerio.load('<html><head></head></html>');
        expect(extractMetaDescription($)).toBeNull();
      });
    });

    describe('countH1', () => {
      it('returns 1 for a single H1 tag', () => {
        const $ = cheerio.load('<h1>Main Title</h1>');
        expect(countH1($)).toBe(1);
      });

      it('returns multiple for multiple H1 tags', () => {
        const $ = cheerio.load('<h1>Title 1</h1><h1>Title 2</h1>');
        expect(countH1($)).toBe(2);
      });

      it('returns 0 when no H1 tag exists', () => {
        const $ = cheerio.load('<h2>Subtitle Only</h2>');
        expect(countH1($)).toBe(0);
      });
    });

    describe('countMissingAltImages', () => {
      it('identifies images missing alt, empty alt, or space-only alt', () => {
        const html = `
          <img src="1.png">
          <img src="2.png" alt="">
          <img src="3.png" alt="   ">
          <img src="4.png" alt="Valid Description">
        `;
        const $ = cheerio.load(html);
        expect(countMissingAltImages($)).toBe(3);
      });

      it('returns 0 when all images have valid alt text', () => {
        const $ = cheerio.load('<img src="1.png" alt="Image 1"><img src="2.png" alt="Image 2">');
        expect(countMissingAltImages($)).toBe(0);
      });
    });

    describe('calculateApproximateWordCount', () => {
      it('calculates visible body words and strips script/style tags', () => {
        const html = `
          <body>
            <script>var secret = "do not count me";</script>
            <style>body { color: red; }</style>
            <p>This is a test of visible words.</p>
          </body>
        `;
        const $ = cheerio.load(html);
        expect(calculateApproximateWordCount($)).toBe(7);
      });

      it('returns 0 for empty HTML body', () => {
        const $ = cheerio.load('<body></body>');
        expect(calculateApproximateWordCount($)).toBe(0);
      });
    });
  });

  // ─────────────────────────────────────────
  // 2. Response Validation Tests (PDF / Image / Non-HTML)
  // ─────────────────────────────────────────
  describe('validateHtmlResponse', () => {
    it('accepts text/html content types', () => {
      expect(() => validateHtmlResponse('text/html; charset=utf-8')).not.toThrow();
    });

    it('rejects application/pdf (PDF URL)', () => {
      expect(() => validateHtmlResponse('application/pdf')).toThrow(UnsupportedContentError);
    });

    it('rejects image/png (Image URL)', () => {
      expect(() => validateHtmlResponse('image/png')).toThrow(UnsupportedContentError);
    });

    it('rejects application/json', () => {
      expect(() => validateHtmlResponse('application/json')).toThrow(UnsupportedContentError);
    });

    it('rejects null content-type', () => {
      expect(() => validateHtmlResponse(null)).toThrow(UnsupportedContentError);
    });
  });

  // ─────────────────────────────────────────
  // 3. HTTP Status Text Mapping Tests
  // ─────────────────────────────────────────
  describe('getStatusText', () => {
    it('maps standard HTTP status codes correctly', () => {
      expect(getStatusText(200)).toBe('OK');
      expect(getStatusText(301)).toBe('Moved Permanently');
      expect(getStatusText(403)).toBe('Forbidden');
      expect(getStatusText(404)).toBe('Not Found');
      expect(getStatusText(500)).toBe('Internal Server Error');
    });

    it('returns Unknown for unmapped codes', () => {
      expect(getStatusText(999)).toBe('Unknown');
    });
  });

  // ─────────────────────────────────────────
  // 4. CAPTCHA & Bot Protection Detection Tests
  // ─────────────────────────────────────────
  describe('detectBotProtection', () => {
    it('detects Cloudflare protection banner', () => {
      const $ = cheerio.load('<title>Just a moment...</title><body>Checking your browser before accessing</body>');
      expect(detectBotProtection($)).toBe(true);
    });

    it('detects CAPTCHA keywords in body text (e.g. Flipkart/recaptcha)', () => {
      const $ = cheerio.load('<body>Please complete the recaptcha verification to continue.</body>');
      expect(detectBotProtection($)).toBe(true);
    });

    it('returns false for standard clean websites', () => {
      const $ = cheerio.load('<title>Example Domain</title><body>Welcome to our website</body>');
      expect(detectBotProtection($)).toBe(false);
    });
  });

  // ─────────────────────────────────────────
  // 5. SEO Score Calculation Tests
  // ─────────────────────────────────────────
  describe('calculateSeoScore', () => {
    it('calculates 100/100 for a perfect page', () => {
      const metrics = {
        pageTitle: 'Perfect Title',
        metaDescription: 'Great meta description',
        h1Count: 1,
        imagesMissingAlt: 0,
        wordCount: 400,
      };
      expect(calculateSeoScore(metrics)).toBe(100);
    });

    it('awards partial credit (10 pts) for multiple H1 tags', () => {
      const metrics = {
        pageTitle: 'Title',
        metaDescription: 'Meta',
        h1Count: 3,
        imagesMissingAlt: 0,
        wordCount: 350,
      };
      expect(calculateSeoScore(metrics)).toBe(90); // 20 + 20 + 10 + 20 + 20
    });

    it('calculates low score (0/100) for missing all elements', () => {
      const metrics = {
        pageTitle: null,
        metaDescription: null,
        h1Count: 0,
        imagesMissingAlt: 5,
        wordCount: 50,
      };
      expect(calculateSeoScore(metrics)).toBe(0);
    });
  });

  // ─────────────────────────────────────────
  // 6. Health Score Calculation Tests
  // ─────────────────────────────────────────
  describe('calculateHealthScore', () => {
    it('calculates high score for reachable, fast website (200 OK, <300ms)', () => {
      const metrics = {
        httpStatus: 200,
        responseTimeMs: 150,
        pageTitle: 'Title',
        metaDescription: 'Desc',
        wordCount: 100,
      };
      // 20 (HTTP) + 20 (Speed <300ms) + 20 (Parsed) + 15 (Title) + 10 (Meta) + 10 (Content) + 5 (No error) = 100
      expect(calculateHealthScore(metrics)).toBe(100);
    });

    it('penalizes slow response times (>1500ms)', () => {
      const metrics = {
        httpStatus: 200,
        responseTimeMs: 2000,
        pageTitle: 'Title',
        metaDescription: 'Desc',
        wordCount: 100,
      };
      expect(calculateHealthScore(metrics)).toBe(80); // 20 (HTTP) + 0 (Speed) + 20 + 15 + 10 + 10 + 5
    });

    it('penalizes non-2xx/3xx HTTP status (e.g. 403 Forbidden)', () => {
      const metrics = {
        httpStatus: 403,
        responseTimeMs: 200,
        pageTitle: 'Forbidden Access',
        metaDescription: null,
        wordCount: 10,
      };
      // 0 (HTTP) + 20 (Speed) + 20 (Parsed) + 15 (Title) + 0 (Meta) + 0 (Content) + 5 (No error) = 60
      expect(calculateHealthScore(metrics)).toBe(60);
    });
  });

  // ─────────────────────────────────────────
  // 7. Complete Audit Service Execution (auditUrl)
  // ─────────────────────────────────────────
  describe('auditUrl', () => {
    it('executes full audit successfully for a valid HTML page', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Sample Site</title>
            <meta name="description" content="A sample site description">
          </head>
          <body>
            <h1>Welcome Header</h1>
            <p>${'word '.repeat(350)}</p>
            <img src="test.jpg" alt="Test image">
          </body>
        </html>
      `;

      axios.get.mockResolvedValueOnce({
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
        data: mockHtml,
      });

      const result = await auditUrl('https://example.com');
      expect(result.url).toBe('https://example.com');
      expect(result.hostname).toBe('example.com');
      expect(result.httpStatus).toBe(200);
      expect(result.httpStatusText).toBe('OK');
      expect(result.pageTitle).toBe('Sample Site');
      expect(result.metaDescription).toBe('A sample site description');
      expect(result.h1Count).toBe(1);
      expect(result.imagesMissingAlt).toBe(0);
      expect(result.wordCount).toBeGreaterThanOrEqual(300);
      expect(result.seoScore).toBe(100);
      expect(result.healthScore).toBe(100);
      expect(result.hasBotProtection).toBe(false);
    });

    it('throws UnsupportedContentError when target returns non-HTML content (e.g. PDF/Image)', async () => {
      axios.get.mockResolvedValueOnce({
        status: 200,
        headers: { 'content-type': 'application/pdf' },
        data: '%PDF-1.4 ...',
      });

      await expect(auditUrl('https://example.com/document.pdf')).rejects.toThrow(UnsupportedContentError);
    });
  });
});
