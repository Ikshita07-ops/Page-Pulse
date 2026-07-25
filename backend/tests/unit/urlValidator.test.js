/**
 * Unit Tests: URL Validator
 * Covers: valid URLs, invalid URLs, edge cases, protocol checks
 */
const { isValidUrl } = require('../../utils/urlValidator');

describe('isValidUrl', () => {
  // ── Valid URLs ──────────────────────────────────────────
  describe('Valid URLs (should return true)', () => {
    it('accepts https://example.com', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
    });

    it('accepts http://example.com', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
    });

    it('accepts https://openai.com', () => {
      expect(isValidUrl('https://openai.com')).toBe(true);
    });

    it('accepts https://github.com', () => {
      expect(isValidUrl('https://github.com')).toBe(true);
    });

    it('accepts https://www.wikipedia.org', () => {
      expect(isValidUrl('https://www.wikipedia.org')).toBe(true);
    });

    it('accepts https://developer.mozilla.org', () => {
      expect(isValidUrl('https://developer.mozilla.org')).toBe(true);
    });

    it('accepts URLs with paths', () => {
      expect(isValidUrl('https://example.com/path/to/page')).toBe(true);
    });

    it('accepts URLs with query strings', () => {
      expect(isValidUrl('https://example.com/search?q=test&lang=en')).toBe(true);
    });

    it('accepts URLs with ports', () => {
      expect(isValidUrl('http://localhost:3000')).toBe(true);
    });

    it('accepts URLs with hash fragments', () => {
      expect(isValidUrl('https://example.com/docs#section-2')).toBe(true);
    });

    it('accepts URLs with subdomains', () => {
      expect(isValidUrl('https://sub.domain.example.com')).toBe(true);
    });

    it('accepts URLs with IP addresses', () => {
      expect(isValidUrl('http://192.168.1.1')).toBe(true);
    });
  });

  // ── Invalid URLs ────────────────────────────────────────
  describe('Invalid URLs (should return false)', () => {
    it('rejects bare text: abc', () => {
      expect(isValidUrl('abc')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isValidUrl('')).toBe(false);
    });

    it('rejects null', () => {
      expect(isValidUrl(null)).toBe(false);
    });

    it('rejects undefined', () => {
      expect(isValidUrl(undefined)).toBe(false);
    });

    it('rejects ftp:// protocol', () => {
      expect(isValidUrl('ftp://example.com')).toBe(false);
    });

    it('rejects javascript: protocol', () => {
      expect(isValidUrl('javascript:alert(1)')).toBe(false);
    });

    it('rejects data: URIs', () => {
      expect(isValidUrl('data:text/html,<h1>test</h1>')).toBe(false);
    });

    it('rejects URLs without protocol', () => {
      expect(isValidUrl('example.com')).toBe(false);
    });

    it('rejects bare domain with www', () => {
      expect(isValidUrl('www.example.com')).toBe(false);
    });

    it('rejects malformed URL htt://bad', () => {
      expect(isValidUrl('htt://bad')).toBe(false);
    });

    it('rejects just a number', () => {
      expect(isValidUrl('12345')).toBe(false);
    });

    it('rejects whitespace-only string', () => {
      expect(isValidUrl('   ')).toBe(false);
    });

    it('rejects URL with missing host', () => {
      expect(isValidUrl('https://')).toBe(false);
    });
  });
});
