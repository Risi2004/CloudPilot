const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Run one platform selection step using stored analysis session IDs.
 */
export async function platformSelectionStep({
  analysisSessionId,
  platformSelectionSessionId = null,
  interviewAnswers = [],
}) {
  const response = await fetch(`${API_URL}/api/platform-selection/step`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      analysis_session_id: analysisSessionId,
      platform_selection_session_id: platformSelectionSessionId,
      interview_answers: interviewAnswers,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Platform selection request failed.');
  }

  return data;
}

/**
 * Load a stored platform selection session (interview progress or recommendation).
 */
export async function getPlatformSelectionSession(sessionId) {
  const response = await fetch(`${API_URL}/api/platform-selection/session/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Platform selection session not found.');
  }

  return data;
}

export function formatConfidence(score) {
  if (score == null || Number.isNaN(Number(score))) return '—';
  return `${Math.round(Number(score) * 100)}%`;
}

export function complexityLabel(complexity) {
  const map = { low: 'Low', medium: 'Medium', high: 'High' };
  return map[complexity] || complexity || 'Unknown';
}
