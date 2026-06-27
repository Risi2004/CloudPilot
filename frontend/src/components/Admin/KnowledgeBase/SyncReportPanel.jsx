import React, { useState } from 'react';
import { formatSyncDuration, formatSyncTimestamp } from '../../../services/knowledgeSync';
import './SyncReportPanel.css';

function SyncReportPanel({ report, summary }) {
  const data = summary || report;
  const [expanded, setExpanded] = useState(true);

  if (!data) return null;

  const errors = data.errors || [];
  const scopeLabel = data.scopeLabel || data.scope_label;
  const errorCount = errors.length;

  return (
    <div className={`sync-report-panel ${expanded ? 'is-expanded' : 'is-collapsed'}`}>
      <div className="sync-report-header">
        <div className="sync-report-header-main">
          <button
            type="button"
            className={`sync-report-toggle ${expanded ? 'expanded' : ''}`}
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse synchronization report' : 'Expand synchronization report'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <div>
            <h3>Synchronization Report</h3>
            {scopeLabel && <span className="sync-report-scope">Scope: {scopeLabel}</span>}
          </div>
        </div>
        <div className="sync-report-header-meta">
          {!expanded && errorCount > 0 && (
            <span className="sync-report-error-badge">{errorCount} error{errorCount === 1 ? '' : 's'}</span>
          )}
          {data.createdAt && (
            <span className="sync-report-time">{formatSyncTimestamp(data.createdAt)}</span>
          )}
        </div>
      </div>

      {expanded && (
        <>
          <div className="sync-report-grid">
            <div className="sync-report-stat">
              <span className="label">New</span>
              <span className="value">{data.newDocuments ?? data.new_documents ?? 0}</span>
            </div>
            <div className="sync-report-stat">
              <span className="label">Updated</span>
              <span className="value">{data.updatedDocuments ?? data.updated_documents ?? 0}</span>
            </div>
            <div className="sync-report-stat">
              <span className="label">Deleted</span>
              <span className="value">{data.deletedDocuments ?? data.deleted_documents ?? 0}</span>
            </div>
            <div className="sync-report-stat">
              <span className="label">Unchanged</span>
              <span className="value">{data.unchangedDocuments ?? data.unchanged_documents ?? 0}</span>
            </div>
            <div className="sync-report-stat">
              <span className="label">Chunks</span>
              <span className="value">{data.totalChunksCreated ?? data.total_chunks_created ?? 0}</span>
            </div>
            <div className="sync-report-stat">
              <span className="label">Embeddings</span>
              <span className="value">
                {data.totalEmbeddingsGenerated ?? data.total_embeddings_generated ?? 0}
              </span>
            </div>
            <div className="sync-report-stat">
              <span className="label">Vectors</span>
              <span className="value">{data.totalVectors ?? data.total_vectors ?? 0}</span>
            </div>
            <div className="sync-report-stat">
              <span className="label">Duration</span>
              <span className="value">
                {formatSyncDuration(data.processingTimeMs ?? data.processing_time_ms)}
              </span>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="sync-report-errors">
              <h4>Errors</h4>
              <ul>
                {errors.map((error, index) => (
                  <li key={`${error.fileKey || error.file_key || 'error'}-${index}`}>
                    {error.fileKey || error.file_key ? `${error.fileKey || error.file_key}: ` : ''}
                    {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SyncReportPanel;
