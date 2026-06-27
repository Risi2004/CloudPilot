import React from 'react';
import { formatEstimatedTime, formatSyncDuration } from '../../../services/knowledgeSync';
import './SyncProgressPanel.css';

function SyncProgressPanel({ progress }) {
  if (!progress) return null;

  const percent = Math.min(100, Math.max(0, progress.progressPercent ?? 0));
  const isRunning = progress.status === 'running';
  const scopeLabel = progress.scopeLabel;

  return (
    <div className="sync-progress-panel">
      <div className="sync-progress-header">
        <div>
          <h3>{isRunning ? 'Synchronizing Knowledge Base' : 'Synchronization Status'}</h3>
          {scopeLabel && <p className="sync-progress-scope">Scope: {scopeLabel}</p>}
          <p className="sync-progress-phase">{progress.phaseLabel}</p>
        </div>
        <span className="sync-progress-percent">{percent}%</span>
      </div>

      <div className="sync-progress-track" aria-hidden="true">
        <div className="sync-progress-fill" style={{ width: `${percent}%` }} />
      </div>

      <div className="sync-progress-meta">
        <span>Elapsed: {formatSyncDuration(progress.elapsedMs)}</span>
        {isRunning && (
          <span>{formatEstimatedTime(progress.estimatedRemainingMs)}</span>
        )}
      </div>

      <div className="sync-progress-stats">
        {progress.totalFiles > 0 && (
          <div className="sync-progress-stat">
            <span className="label">Total files</span>
            <span className="value">{progress.totalFiles}</span>
          </div>
        )}
        {progress.filesToIndex > 0 && (
          <div className="sync-progress-stat">
            <span className="label">To index</span>
            <span className="value">{progress.filesToIndex}</span>
          </div>
        )}
        <div className="sync-progress-stat">
          <span className="label">Indexed</span>
          <span className="value">{progress.indexedFiles ?? 0}</span>
        </div>
        <div className="sync-progress-stat">
          <span className="label">Unchanged</span>
          <span className="value">{progress.unchangedFiles ?? 0}</span>
        </div>
        {progress.totalBatches > 0 && (
          <div className="sync-progress-stat">
            <span className="label">Batch</span>
            <span className="value">
              {progress.currentBatch ?? 0}/{progress.totalBatches}
            </span>
          </div>
        )}
        {(progress.chunksCreated > 0 || progress.totalVectors > 0) && (
          <>
            <div className="sync-progress-stat">
              <span className="label">Chunks</span>
              <span className="value">{progress.chunksCreated ?? 0}</span>
            </div>
            <div className="sync-progress-stat">
              <span className="label">Vectors</span>
              <span className="value">{progress.totalVectors ?? 0}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SyncProgressPanel;
