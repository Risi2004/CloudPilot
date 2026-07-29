const VERCEL_API = 'https://api.vercel.com';

class VercelApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

function withTeam(path, teamId) {
  if (!teamId) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}teamId=${encodeURIComponent(teamId)}`;
}

async function vercelFetch(apiKey, path, { method = 'GET', body } = {}) {
  const response = await fetch(`${VERCEL_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    throw new VercelApiError('Vercel API token is invalid or expired.', 401);
  }
  if (response.status === 402) {
    throw new VercelApiError('Vercel requires payment information to perform this request.', 402);
  }
  if (response.status === 404) {
    throw new VercelApiError('The requested Vercel resource was not found.', 404);
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new VercelApiError(`Vercel API request failed (${response.status}): ${text.slice(0, 300)}`, response.status);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function getAuthenticatedUser(apiKey) {
  const result = await vercelFetch(apiKey, '/v2/user');
  const user = result && result.user;
  if (!user) {
    throw new VercelApiError('Could not resolve the authenticated Vercel user.', 502);
  }
  return { accountLabel: user.username || user.name || user.email || user.id };
}

async function createProject(apiKey, payload, { teamId } = {}) {
  return vercelFetch(apiKey, withTeam('/v11/projects', teamId), { method: 'POST', body: payload });
}

async function createEnvVars(apiKey, projectIdOrName, envVars, { teamId } = {}) {
  return vercelFetch(
    apiKey,
    withTeam(`/v10/projects/${encodeURIComponent(projectIdOrName)}/env?upsert=true`, teamId),
    { method: 'POST', body: envVars }
  );
}

async function createDeployment(apiKey, payload, { teamId } = {}) {
  return vercelFetch(apiKey, withTeam('/v13/deployments', teamId), { method: 'POST', body: payload });
}

async function getDeployment(apiKey, deploymentId, { teamId } = {}) {
  return vercelFetch(apiKey, withTeam(`/v13/deployments/${encodeURIComponent(deploymentId)}`, teamId));
}

async function getDeploymentEvents(apiKey, deploymentId, { teamId, limit = 200, since } = {}) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('direction', 'forward');
  if (since) params.set('since', String(since));
  const path = withTeam(`/v3/deployments/${encodeURIComponent(deploymentId)}/events?${params.toString()}`, teamId);
  const events = await vercelFetch(apiKey, path);
  return Array.isArray(events) ? events : [];
}

async function deleteProject(apiKey, projectIdOrName, { teamId } = {}) {
  return vercelFetch(apiKey, withTeam(`/v9/projects/${encodeURIComponent(projectIdOrName)}`, teamId), { method: 'DELETE' });
}

// Note: Vercel only returns decrypted values for some env var types - entries
// created as "encrypted" (what createEnvVars uses) may come back with no
// `value` field at all. Callers must treat a missing value as "unknown", not
// as evidence of anything, and only act on values that are actually present.
async function listEnvVars(apiKey, projectIdOrName, { teamId } = {}) {
  const result = await vercelFetch(apiKey, withTeam(`/v9/projects/${encodeURIComponent(projectIdOrName)}/env`, teamId));
  const list = (result && result.envs) || [];
  return list.map((v) => ({ key: v.key, value: v.value }));
}

const VERCEL_DEPLOY_TERMINAL_SUCCESS = new Set(['READY']);
const VERCEL_DEPLOY_TERMINAL_FAILURE = new Set(['ERROR', 'CANCELED']);

module.exports = {
  VercelApiError,
  getAuthenticatedUser,
  createProject,
  createEnvVars,
  listEnvVars,
  createDeployment,
  getDeployment,
  getDeploymentEvents,
  deleteProject,
  VERCEL_DEPLOY_TERMINAL_SUCCESS,
  VERCEL_DEPLOY_TERMINAL_FAILURE,
};
