/**
 * Normalize repository URLs for consistent session lookup keys.
 */
function normalizeRepoUrl(url) {
  if (!url || typeof url !== 'string') return '';
  return url.trim().toLowerCase().replace(/\/+$/, '');
}

module.exports = { normalizeRepoUrl };
