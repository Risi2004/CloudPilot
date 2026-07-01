const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function deploymentStep({
  architectureSessionId,
  deploymentSessionId,
  action = 'prepare',
  branch,
  credentials,
  envVars,
  saveCredentials = false,
  confirmed = false,
}) {
  const response = await fetch(`${API_URL}/api/deployment/step`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      architecture_session_id: architectureSessionId,
      deployment_session_id: deploymentSessionId,
      action,
      branch,
      credentials,
      env_vars: envVars,
      save_credentials: saveCredentials,
      confirmed,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Deployment step failed.');
    error.code = data.code;
    throw error;
  }
  return data;
}

export async function getDeploymentSession(sessionId) {
  const response = await fetch(`${API_URL}/api/deployment/session/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Deployment session not found.');
  }
  return data;
}
