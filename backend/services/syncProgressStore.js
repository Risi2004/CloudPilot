const crypto = require('crypto');

/** @type {import('./syncProgressStore').SyncProgressState | null} */
let activeSync = null;

function computeEstimatedRemainingMs(startedAt, progressPercent) {
  if (!startedAt || !progressPercent || progressPercent <= 0 || progressPercent >= 100) {
    return null;
  }
  const elapsedMs = Date.now() - startedAt;
  return Math.round((elapsedMs / progressPercent) * (100 - progressPercent));
}

function createInitialProgress(syncId, userId) {
  const startedAt = Date.now();
  return {
    syncId,
    userId: String(userId),
    status: 'running',
    phase: 'starting',
    phaseLabel: 'Starting synchronization...',
    progressPercent: 0,
    totalFiles: 0,
    preparedFiles: 0,
    filesToIndex: 0,
    indexedFiles: 0,
    unchangedFiles: 0,
    currentBatch: 0,
    totalBatches: 0,
    totalVectors: 0,
    chunksCreated: 0,
    startedAt,
    elapsedMs: 0,
    estimatedRemainingMs: null,
    error: null,
    result: null,
  };
}

function updateProgress(partial) {
  if (!activeSync || activeSync.status !== 'running') return;

  Object.assign(activeSync, partial, {
    elapsedMs: Date.now() - activeSync.startedAt,
  });

  if (typeof activeSync.progressPercent === 'number') {
    activeSync.estimatedRemainingMs = computeEstimatedRemainingMs(
      activeSync.startedAt,
      activeSync.progressPercent,
    );
  }
}

function startSyncJob(userId, scopeMeta = {}) {
  if (activeSync?.status === 'running') {
    const err = new Error('A knowledge sync is already in progress.');
    err.code = 'SYNC_IN_PROGRESS';
    err.syncId = activeSync.syncId;
    throw err;
  }

  const syncId = crypto.randomUUID();
  activeSync = {
    ...createInitialProgress(syncId, userId),
    ...scopeMeta,
  };
  return activeSync;
}

function completeSyncJob(result) {
  if (!activeSync) return;
  activeSync.status = 'completed';
  activeSync.phase = 'completed';
  activeSync.phaseLabel = 'Synchronization complete';
  activeSync.progressPercent = 100;
  activeSync.estimatedRemainingMs = 0;
  activeSync.elapsedMs = Date.now() - activeSync.startedAt;
  activeSync.result = result;
}

function failSyncJob(message) {
  if (!activeSync) return;
  activeSync.status = 'failed';
  activeSync.phase = 'failed';
  activeSync.phaseLabel = 'Synchronization failed';
  activeSync.error = message;
  activeSync.elapsedMs = Date.now() - activeSync.startedAt;
  activeSync.estimatedRemainingMs = null;
}

function getSyncProgress(syncId) {
  if (!activeSync || activeSync.syncId !== syncId) {
    return null;
  }

  return {
    syncId: activeSync.syncId,
    status: activeSync.status,
    phase: activeSync.phase,
    phaseLabel: activeSync.phaseLabel,
    progressPercent: activeSync.progressPercent,
    scopeLabel: activeSync.scopeLabel,
    folderPrefix: activeSync.folderPrefix,
    totalFiles: activeSync.totalFiles,
    preparedFiles: activeSync.preparedFiles,
    filesToIndex: activeSync.filesToIndex,
    indexedFiles: activeSync.indexedFiles,
    unchangedFiles: activeSync.unchangedFiles,
    currentBatch: activeSync.currentBatch,
    totalBatches: activeSync.totalBatches,
    totalVectors: activeSync.totalVectors,
    chunksCreated: activeSync.chunksCreated,
    elapsedMs: activeSync.elapsedMs,
    estimatedRemainingMs: activeSync.estimatedRemainingMs,
    error: activeSync.error,
    result: activeSync.result,
  };
}

function getActiveSyncJob() {
  if (!activeSync || activeSync.status !== 'running') {
    return null;
  }
  return getSyncProgress(activeSync.syncId);
}

module.exports = {
  startSyncJob,
  updateProgress,
  completeSyncJob,
  failSyncJob,
  getSyncProgress,
  getActiveSyncJob,
};
