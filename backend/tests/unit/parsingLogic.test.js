/**
 * Unit Tests: Parsing Logic
 * Focuses specifically on HTML parsing, DOM extraction, content validation, and parsing error cases.
 * 
 * Requirement Coverage:
 * - Happy path: Full parsing of valid HTML documents (title, meta description, H1 count, alt images, word count, bot detection).
 * - Failure Case 1: Non-HTML content payload (application/pdf, image/png, etc.) throwing UnsupportedContentError.
 * - Failure Case 2: Cheerio/DOM parsing failure or malformed HTML handling throwing ParsingError.
 * - Failure Case 3 (Edge Case): Missing HTML tags/empty body returning safe defaults (null/0) without crashing.
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
  auditUrl,
} = require('../../services/auditService');
const { UnsupportedContentError, ParsingError } = require('../../utils/errors');

jest.mock('axios');
const axios = require('axios');

describe('HTML Parsing Logic Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // HAPPY PATH TESTS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Happy Path: Complete HTML Parsing', () => {
    it('successfully parses a complete, well-formed HTML page and extracts all metrics', async () => {
      const validHtml = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <title>  Page Pulse Test Title  </title>
            <meta name="description" content="This is an optimized SEO meta description for testing.">
          </head>
          <body>
            <h1>Main Page Header</h1>
            <p>This is paragraph text containing visible words for the word count algorithm testing.</p>
            <img src="banner.png" alt="Hero Banner Image">
            <img src="icon.png" alt="Icon Graphic">
            <script>var analyticsData = "ignore script content";</script>
            <style>body { font-family: sans-serif; }</style>
          </body>
        </html>
      `;

      axios.get.mockResolvedValueOnce({
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
        data: validHtml,
      });

      const result = await auditUrl('https://example.com/test-page');

      expect(result.pageTitle).toBe('Page Pulse Test Title');
      expect(result.metaDescription).toBe('This is an optimized SEO meta description for testing.');
      expect(result.h1Count).toBe(1);
      expect(result.imagesMissingAlt).toBe(0);
      expect(result.wordCount).toBeGreaterThan(10);
      expect(result.hasBotProtection).toBe(false);
      expect(result.seoScore).toBeGreaterThan(0);
      expect(result.healthScore).toBeGreaterThan(0);
    });

    it('correctly extracts individual DOM elements via helper functions', () => {
      const html = `
        <html>
          <head>
            <title>Unit Test Title</title>
            <meta name="description" content="Unit Test Description">
          </head>
          <body>
            <h1>Heading 1</h1>
            <p>Word one word two word three.</p>
            <img src="test.jpg" alt="Valid Alt">
          </body>
        </html>
      `;
      const $ = cheerio.load(html);

      expect(extractTitle($)).toBe('Unit Test Title');
      expect(extractMetaDescription($)).toBe('Unit Test Description');
      expect(countH1($)).toBe(1);
      expect(countMissingAltImages($)).toBe(0);
      expect(calculateApproximateWordCount($)).toBe(8); // "Heading 1 Word one word two word three."
      expect(detectBotProtection($)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FAILURE CASE 1: Non-HTML / Unsupported Content Type
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Failure Case 1: Unsupported Content Types', () => {
    it('throws UnsupportedContentError when target returns PDF content (application/pdf)', () => {
      expect(() => validateHtmlResponse('application/pdf')).toThrow(UnsupportedContentError);
      expect(() => validateHtmlResponse('application/pdf')).toThrow(
        'Target URL does not return HTML content.'
      );
    });

    it('throws UnsupportedContentError when target returns PNG image (image/png)', () => {
      expect(() => validateHtmlResponse('image/png')).toThrow(UnsupportedContentError);
    });

    it('throws UnsupportedContentError when target returns JSON (application/json)', () => {
      expect(() => validateHtmlResponse('application/json')).toThrow(UnsupportedContentError);
    });

    it('throws UnsupportedContentError when content-type header is missing/null', () => {
      expect(() => validateHtmlResponse(null)).toThrow(UnsupportedContentError);
      expect(() => validateHtmlResponse(undefined)).toThrow(UnsupportedContentError);
    });

    it('fails auditUrl execution when response content-type is non-HTML', async () => {
      axios.get.mockResolvedValueOnce({
        status: 200,
        headers: { 'content-type': 'application/octet-stream' },
        data: Buffer.from('binary data'),
      });

      await expect(auditUrl('https://example.com/file.bin')).rejects.toThrow(
        UnsupportedContentError
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FAILURE CASE 2: DOM Parsing Failure / Malformed HTML Exception
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Failure Case 2: Parsing Exceptions & Malformed Content', () => {
    it('throws ParsingError when HTML parsing encounters an unexpected failure', async () => {
      axios.get.mockResolvedValue({
        status: 200,
        headers: { 'content-type': 'text/html' },
        data: Symbol('invalid_html_payload'), // Symbol causes string conversion TypeError in Cheerio
      });

      await expect(auditUrl('https://example.com')).rejects.toThrow(ParsingError);
    });

    it('detects Cloudflare and bot protection challenge screens as bot protected', () => {
      const cfHtml = `
        <html>
          <head><title>Just a moment...</title></head>
          <body>
            <h1>Attention Required! | Cloudflare</h1>
            <p>Please complete the security check to access the website.</p>
          </body>
        </html>
      `;
      const $ = cheerio.load(cfHtml);
      expect(detectBotProtection($)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FAILURE CASE 3 / EDGE CASES: Missing Elements & Partial HTML
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Failure Case 3: Missing HTML Elements & Fallbacks', () => {
    it('returns null and zero values for empty or missing DOM elements without crashing', () => {
      const emptyHtml = '<html><head></head><body></body></html>';
      const $ = cheerio.load(emptyHtml);

      expect(extractTitle($)).toBeNull();
      expect(extractMetaDescription($)).toBeNull();
      expect(countH1($)).toBe(0);
      expect(countMissingAltImages($)).toBe(0);
      expect(calculateApproximateWordCount($)).toBe(0);
    });

    it('correctly counts missing, empty, or whitespace-only alt attributes on img tags', () => {
      const htmlWithBadImgs = `
        <div>
          <img src="1.jpg">
          <img src="2.jpg" alt="">
          <img src="3.jpg" alt="   ">
          <img src="4.jpg" alt="Valid alt text">
        </div>
      `;
      const $ = cheerio.load(htmlWithBadImgs);
      expect(countMissingAltImages($)).toBe(3);
    });

    it('strips script, style, and noscript blocks before calculating word count', () => {
      const htmlWithCode = `
        <body>
          <script>function test() { return "hello world JavaScript code"; }</script>
          <style>h1 { color: blue; margin: 0; padding: 0; }</style>
          <noscript>Please enable JavaScript in your browser to continue.</noscript>
          <h1>Actual Title Text</h1>
          <p>Visible body sentence here.</p>
        </body>
      `;
      const $ = cheerio.load(htmlWithCode);
      // Words: "Actual Title Text Visible body sentence here." = 7 words
      expect(calculateApproximateWordCount($)).toBe(7);
    });
  });
});
