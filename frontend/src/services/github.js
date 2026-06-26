const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function authHeaders() {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('You must be signed in to use GitHub integration.');
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || 'GitHub request failed.');
  }
  return payload;
}

export async function getGitHubStatus() {
  const response = await fetch(`${API_URL}/api/github/status`, {
    headers: authHeaders(),
  });
  return parseResponse(response);
}

export async function connectGitHub() {
  const response = await fetch(`${API_URL}/api/github/connect`, {
    headers: authHeaders(),
  });
  const payload = await parseResponse(response);
  if (payload.url) {
    window.location.href = payload.url;
  }
}

export async function listGitHubRepos() {
  const response = await fetch(`${API_URL}/api/github/repos`, {
    headers: authHeaders(),
  });
  return parseResponse(response);
}

export async function disconnectGitHub() {
  const response = await fetch(`${API_URL}/api/github/disconnect`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return parseResponse(response);
}

export function formatRepoUpdatedAt(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}
