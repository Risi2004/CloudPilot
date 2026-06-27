const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function authHeaders() {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('You must be signed in as an administrator.');
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || 'Knowledge request failed.');
  }
  return payload;
}

export async function startKnowledgeSync(options = {}) {
  const body = {};
  if (options.dataSourceId) body.dataSourceId = options.dataSourceId;
  if (options.folderPrefix) body.folderPrefix = options.folderPrefix;
  if (options.scopeLabel) body.scopeLabel = options.scopeLabel;

  const response = await fetch(`${API_URL}/api/knowledge/sync`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));

  if (response.status === 409 && payload.syncId) {
    return { syncId: payload.syncId, resumed: true };
  }

  if (!response.ok) {
    throw new Error(payload.message || 'Knowledge synchronization failed.');
  }

  return { syncId: payload.syncId, resumed: false };
}

export async function getKnowledgeSyncProgress(syncId) {
  const response = await fetch(`${API_URL}/api/knowledge/sync/progress/${syncId}`, {
    headers: authHeaders(),
  });
  return parseResponse(response);
}

export async function getActiveKnowledgeSync() {
  const response = await fetch(`${API_URL}/api/knowledge/sync/active`, {
    headers: authHeaders(),
  });
  return parseResponse(response);
}

/** @deprecated Use startKnowledgeSync + polling instead */
export async function synchronizeKnowledgeBase() {
  const { syncId } = await startKnowledgeSync();
  return waitForKnowledgeSync(syncId);
}

export function waitForKnowledgeSync(syncId, { onProgress, pollIntervalMs = 1500 } = {}) {
  return new Promise((resolve, reject) => {
    let stopped = false;

    const poll = async () => {
      if (stopped) return;

      try {
        const progress = await getKnowledgeSyncProgress(syncId);
        if (typeof onProgress === 'function') {
          onProgress(progress);
        }

        if (progress.status === 'completed') {
          stopped = true;
          resolve(progress.result);
          return;
        }

        if (progress.status === 'failed') {
          stopped = true;
          reject(new Error(progress.error || 'Knowledge synchronization failed.'));
          return;
        }
      } catch (err) {
        stopped = true;
        reject(err);
        return;
      }

      setTimeout(poll, pollIntervalMs);
    };

    poll();
  });
}

export async function getLatestSyncReport() {
  const response = await fetch(`${API_URL}/api/knowledge/sync/latest`, {
    headers: authHeaders(),
  });
  return parseResponse(response);
}

export async function queryDocumentation(question, options = {}) {
  const response = await fetch(`${API_URL}/api/documentation/query`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      question,
      repository_analysis: options.repositoryAnalysis || null,
      platform_filter: options.platformFilter || null,
      top_k: options.topK || null,
    }),
  });
  return parseResponse(response);
}

export function formatSyncDuration(ms) {
  if (!ms && ms !== 0) return '—';
  if (ms < 1000) return `${ms} ms`;
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds} s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) {
    return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export function formatSyncTimestamp(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function formatEstimatedTime(ms) {
  if (ms == null || ms <= 0) return 'Calculating...';
  return `~${formatSyncDuration(ms)} remaining`;
}
