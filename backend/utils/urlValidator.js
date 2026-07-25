/**
 * Validates whether a given string is a valid HTTP/HTTPS URL.
 * @param {string} urlString - The URL string to validate.
 * @returns {boolean} True if valid HTTP/HTTPS URL, false otherwise.
 */
const isValidUrl = (urlString) => {
  if (!urlString || typeof urlString !== 'string') {
    return false;
  }

  const trimmed = urlString.trim();
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

module.exports = {
  isValidUrl,
};
