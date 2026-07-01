import { normalizeAnalysisResult } from '../utils/analysisDisplay';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

function parseAnalysisPayload(payload) {
  const { sessionId, sourceUrl, ...result } = payload;
  return {
    sessionId,
    sourceUrl,
    result: normalizeAnalysisResult(result),
  };
}

/**
 * Run repository analysis via the backend agent-runtime bridge.
 * Results are stored temporarily in MongoDB on the server.
 */
export async function analyzeRepository(source, { forceRefresh = false } = {}) {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('You must be signed in to analyze repositories.');
  }

  const response = await fetch(`${API_URL}/api/repositories/analyze`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ source, forceRefresh }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || 'Repository analysis failed.');
  }

  return parseAnalysisPayload(payload);
}

/**
 * Load a stored analysis session by ID or repo URL (no re-scan).
 */
export async function getAnalysisSession({ sessionId, url } = {}) {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('You must be signed in to load analysis sessions.');
  }

  const endpoint = sessionId
    ? `${API_URL}/api/repositories/session/${encodeURIComponent(sessionId)}`
    : `${API_URL}/api/repositories/session?url=${encodeURIComponent(url)}`;

  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || 'Analysis session not found.');
  }

  return parseAnalysisPayload(payload);
}

/**
 * Return stored analysis when available, otherwise run a fresh scan.
 */
export async function getOrAnalyzeRepository(source, { forceRefresh = false } = {}) {
  if (!forceRefresh) {
    try {
      return await getAnalysisSession({ url: source });
    } catch {
      // No stored session — fall through to analyze
    }
  }

  return analyzeRepository(source, { forceRefresh: true });
}

export function formatFrameworks(facts) {
  const frontend = facts?.frameworks?.frontend || [];
  const backend = facts?.frameworks?.backend || [];
  const all = [...frontend, ...backend];
  return all.length ? all.join(', ') : 'None detected';
}

export function formatLanguages(facts) {
  const langs = facts?.repository?.languages || [];
  if (!langs.length) {
    return facts?.runtime?.primary || 'Unknown';
  }
  return langs.map((l) => l.name).join(', ');
}

export function formatScannedAt(source) {
  if (!source?.scanned_at) return '—';
  try {
    return new Date(source.scanned_at).toLocaleString();
  } catch {
    return source.scanned_at;
  }
}

export { displayNarrativeText } from '../utils/analysisDisplay';
