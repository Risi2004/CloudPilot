import { normalizeAnalysisResult } from '../utils/analysisDisplay';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Run repository analysis via the backend agent-runtime bridge.
 */
export async function analyzeRepository(source) {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('You must be signed in to analyze repositories.');
  }

  const response = await fetch(`${API_URL}/api/repositories/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ source }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || 'Repository analysis failed.');
  }

  return normalizeAnalysisResult(payload);
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
