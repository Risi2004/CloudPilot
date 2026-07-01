const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function generateArchitecture({
  analysisSessionId,
  platformSelectionSessionId,
  forceRefresh = false,
}) {
  const response = await fetch(`${API_URL}/api/architecture/generate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      analysis_session_id: analysisSessionId,
      platform_selection_session_id: platformSelectionSessionId,
      forceRefresh,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Architecture generation failed.');
  }
  return data;
}

export async function getArchitectureSession(sessionId) {
  const response = await fetch(`${API_URL}/api/architecture/session/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Architecture session not found.');
  }
  return data;
}

export function formatConfidence(score) {
  if (score == null || Number.isNaN(Number(score))) return '—';
  return `${Math.round(Number(score) * 100)}%`;
}
