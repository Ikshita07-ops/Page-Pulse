const axios = require('axios');
const cheerio = require('cheerio');
const { UnsupportedContentError, ParsingError } = require('../utils/errors');

// HTTP status code to human-readable text mapping
const HTTP_STATUS_TEXT = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  301: 'Moved Permanently',
  302: 'Found',
  304: 'Not Modified',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

const getStatusText = (code) => HTTP_STATUS_TEXT[code] || 'Unknown';

// Modular Helper Functions (Single Responsibility)
const extractTitle = ($) => $('title').text().trim() || null;

const extractMetaDescription = ($) => $('meta[name="description"]').attr('content') || null;

const countH1 = ($) => $('h1').length;

const countMissingAltImages = ($) => {
  let count = 0;
  $('img').each((_, el) => {
    const alt = $(el).attr('alt');
    if (alt === undefined || alt === null || alt.trim() === '') {
      count++;
    }
  });
  return count;
};

const calculateApproximateWordCount = ($) => {
  // Remove scripts and styles before extracting text
  $('script, style, noscript').remove();
  const text = $('body').text().trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
};

const extractFavicon = (hostname) => {
  // Use Google's reliable favicon service instead of parsing HTML
  return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
};

const validateHtmlResponse = (contentType) => {
  if (!contentType || !contentType.includes('text/html')) {
    throw new UnsupportedContentError('Target URL does not return HTML content.');
  }
};

// Detect common bot-protection patterns in the page body
const detectBotProtection = ($) => {
  const bodyText = $('body').text().toLowerCase();
  const title = $('title').text().toLowerCase();

  const botSignals = [
    'just a moment',        // Cloudflare
    'checking your browser', // Cloudflare
    'captcha',
    'recaptcha',
    'ddos-guard',
    'access denied',
    'robot check',
    'are you a human',
    'bot verification',
    'please verify you are a human',
    'cf-browser-verification',
  ];

  const htmlSource = $.html().toLowerCase();
  const hasBotProtection = botSignals.some(signal =>
    bodyText.includes(signal) || title.includes(signal) || htmlSource.includes(signal)
  );

  return hasBotProtection;
};

const measureResponseTime = async (url) => {
  const startTime = Date.now();
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    timeout: 10000,
    maxContentLength: 10 * 1024 * 1024, // 10MB limit
    maxBodyLength: 10 * 1024 * 1024,
    validateStatus: () => true, // Never throw on 4xx/5xx — we audit the real response
  });
  const responseTimeMs = Date.now() - startTime;
  return { response, responseTimeMs };
};

// SEO Score: Title(20) + Meta(20) + H1(20) + Alt images(20) + Word count(20)
const calculateSeoScore = (metrics) => {
  let score = 0;
  if (metrics.pageTitle) score += 20;
  if (metrics.metaDescription) score += 20;
  if (metrics.h1Count === 1) score += 20;
  else if (metrics.h1Count > 1) score += 10; // Multiple H1s — partial credit
  if (metrics.imagesMissingAlt === 0) score += 20;
  if (metrics.wordCount >= 300) score += 20;
  return score;
};

// Health Score: HTTP(20) + ResponseTime(20) + HTML Parsed(20) + Title(15) + Meta(10) + Content(10) + No Errors(5)
const calculateHealthScore = (metrics) => {
  let score = 0;

  // HTTP success means status 2xx or 3xx
  if (metrics.httpStatus >= 200 && metrics.httpStatus < 400) score += 20;

  // Response time scoring
  if (metrics.responseTimeMs < 300) score += 20;
  else if (metrics.responseTimeMs < 800) score += 15;
  else if (metrics.responseTimeMs < 1500) score += 8;
  // >1500ms = 0 points

  // HTML was parsed successfully (we only reach here if parsing worked)
  score += 20;

  // Title present
  if (metrics.pageTitle) score += 15;

  // Meta description present
  if (metrics.metaDescription) score += 10;

  // Content extracted (word count > 50)
  if (metrics.wordCount > 50) score += 10;

  // No parsing errors (we only reach here if no parse errors)
  score += 5;

  return Math.min(100, score);
};

const auditUrl = async (url) => {
  const { response, responseTimeMs } = await measureResponseTime(url);

  validateHtmlResponse(response.headers['content-type']);

  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = url;
  }

  let metrics;
  try {
    const $ = cheerio.load(response.data);
    const hasBotProtection = detectBotProtection($);

    metrics = {
      url,
      hostname,
      httpStatus: response.status,
      httpStatusText: getStatusText(response.status),
      responseTimeMs,
      timestamp: new Date().toISOString(),
      hasBotProtection,
      pageTitle: extractTitle($),
      metaDescription: extractMetaDescription($),
      h1Count: countH1($),
      imagesMissingAlt: countMissingAltImages($),
      wordCount: calculateApproximateWordCount($),
      favicon: extractFavicon(hostname),
    };
  } catch (error) {
    if (error.isOperational) throw error;
    throw new ParsingError('Failed to parse HTML content.');
  }

  const seoScore = calculateSeoScore(metrics);
  const healthScore = calculateHealthScore(metrics);

  return {
    ...metrics,
    seoScore,
    healthScore,
  };
};

module.exports = {
  auditUrl,
  extractTitle,
  extractMetaDescription,
  countH1,
  countMissingAltImages,
  calculateApproximateWordCount,
  validateHtmlResponse,
  measureResponseTime,
  detectBotProtection,
  getStatusText,
  calculateSeoScore,
  calculateHealthScore,
};
