const RENDER_API = 'https://api.render.com/v1';

class RenderApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function renderFetch(apiKey, path, { method = 'GET', body } = {}) {
  const response = await fetch(`${RENDER_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    throw new RenderApiError('Render API key is invalid or expired.', 401);
  }
  if (response.status === 402) {
    throw new RenderApiError('Render requires payment information to perform this request.', 402);
  }
  if (response.status === 404) {
    throw new RenderApiError('The requested Render resource was not found.', 404);
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new RenderApiError(`Render API request failed (${response.status}): ${text.slice(0, 300)}`, response.status);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function getWorkspaceOwnerId(apiKey) {
  const owners = await renderFetch(apiKey, '/owners?limit=20');
  if (!Array.isArray(owners) || owners.length === 0) {
    throw new RenderApiError('This Render API key has no accessible workspaces.', 404);
  }
  const personal = owners.find((o) => o.owner && o.owner.type === 'user');
  const chosen = (personal || owners[0]).owner;
  return { ownerId: chosen.id, accountLabel: chosen.name || chosen.email || chosen.id };
}

async function createService(apiKey, payload) {
  return renderFetch(apiKey, '/services', { method: 'POST', body: payload });
}

async function updateEnvVars(apiKey, serviceId, envVars) {
  return renderFetch(apiKey, `/services/${encodeURIComponent(serviceId)}/env-vars`, {
    method: 'PUT',
    body: envVars,
  });
}

async function triggerDeploy(apiKey, serviceId, { clearCache = 'do_not_clear' } = {}) {
  return renderFetch(apiKey, `/services/${encodeURIComponent(serviceId)}/deploys`, {
    method: 'POST',
    body: { clearCache },
  });
}

async function getDeploy(apiKey, serviceId, deployId) {
  return renderFetch(apiKey, `/services/${encodeURIComponent(serviceId)}/deploys/${encodeURIComponent(deployId)}`);
}

async function listBuildLogs(apiKey, { ownerId, resource, limit = 50 }) {
  const params = new URLSearchParams();
  params.set('ownerId', ownerId);
  params.append('resource', resource);
  params.append('type', 'build');
  params.set('limit', String(limit));
  params.set('direction', 'forward');
  const result = await renderFetch(apiKey, `/logs?${params.toString()}`);
  return (result && result.logs) || [];
}

async function deleteService(apiKey, serviceId) {
  return renderFetch(apiKey, `/services/${encodeURIComponent(serviceId)}`, { method: 'DELETE' });
}

const RENDER_DEPLOY_TERMINAL_SUCCESS = new Set(['live']);
const RENDER_DEPLOY_TERMINAL_FAILURE = new Set(['build_failed', 'update_failed', 'canceled', 'pre_deploy_failed', 'deactivated']);

module.exports = {
  RenderApiError,
  getWorkspaceOwnerId,
  createService,
  updateEnvVars,
  triggerDeploy,
  getDeploy,
  listBuildLogs,
  deleteService,
  RENDER_DEPLOY_TERMINAL_SUCCESS,
  RENDER_DEPLOY_TERMINAL_FAILURE,
};
