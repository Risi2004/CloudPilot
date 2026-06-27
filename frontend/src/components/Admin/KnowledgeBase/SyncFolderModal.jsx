import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchSyncFolders } from '../../../services/knowledgeSync';
import './ConnectorList.css';
import './SyncFolderModal.css';

function buildChildrenByParentId(folders) {
  const childrenByParentId = new Map();
  for (const folder of folders) {
    if (!folder.parentId) continue;
    const siblings = childrenByParentId.get(folder.parentId) || [];
    siblings.push(folder._id);
    childrenByParentId.set(folder.parentId, siblings);
  }
  return childrenByParentId;
}

function collectDescendantIds(folderId, childrenByParentId) {
  const descendants = [];
  const stack = [...(childrenByParentId.get(folderId) || [])];

  while (stack.length > 0) {
    const id = stack.pop();
    descendants.push(id);
    const children = childrenByParentId.get(id);
    if (children) stack.push(...children);
  }

  return descendants;
}

function expandFolderSelection(selectedIds, folders) {
  const childrenByParentId = buildChildrenByParentId(folders);
  const next = new Set(selectedIds);

  for (const id of selectedIds) {
    for (const descendantId of collectDescendantIds(id, childrenByParentId)) {
      next.add(descendantId);
    }
  }

  return next;
}

function collapseToTopLevelSelections(selectedIds, folders) {
  const selected = new Set(Array.from(selectedIds, String));
  const byId = new Map(folders.map((folder) => [folder._id, folder]));

  return Array.from(selected).filter((id) => {
    let parentId = byId.get(id)?.parentId;
    while (parentId) {
      if (selected.has(parentId)) return false;
      parentId = byId.get(parentId)?.parentId;
    }
    return true;
  });
}

function SyncFolderModal({ open, onClose, onConfirm, initialFolderId = null }) {
  const normalizedInitialId = initialFolderId ? String(initialFolderId) : null;
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncAll, setSyncAll] = useState(!normalizedInitialId);
  const [selectedIds, setSelectedIds] = useState(() =>
    normalizedInitialId ? new Set([normalizedInitialId]) : new Set(),
  );

  useEffect(() => {
    if (!open) return;

    setSyncAll(!normalizedInitialId);
    setSelectedIds(normalizedInitialId ? new Set([normalizedInitialId]) : new Set());
    setError('');
    setLoading(true);

    let cancelled = false;

    fetchSyncFolders()
      .then((data) => {
        if (cancelled) return;
        const loadedFolders = data.folders || [];
        setFolders(loadedFolders);
        if (normalizedInitialId) {
          setSelectedIds(
            expandFolderSelection(new Set([normalizedInitialId]), loadedFolders),
          );
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load folders.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, normalizedInitialId]);

  if (!open) return null;

  const handleSyncAllChange = (checked) => {
    setSyncAll(checked);
    if (checked) setSelectedIds(new Set());
  };

  const toggleFolder = (folderId) => {
    setSyncAll(false);
    setSelectedIds((prev) => {
      const childrenByParentId = buildChildrenByParentId(folders);
      const descendantIds = collectDescendantIds(folderId, childrenByParentId);
      const affectedIds = [folderId, ...descendantIds];
      const next = new Set(prev);
      const isSelected = next.has(folderId);

      for (const id of affectedIds) {
        if (isSelected) next.delete(id);
        else next.add(id);
      }

      return next;
    });
  };

  const handleConfirm = () => {
    if (!syncAll && selectedIds.size === 0) return;
    const rootIds = collapseToTopLevelSelections(selectedIds, folders);
    onConfirm({
      syncAll,
      dataSourceIds: syncAll ? [] : rootIds,
    });
  };

  const canConfirm = syncAll || selectedIds.size > 0;
  const rootSelectionCount = collapseToTopLevelSelections(selectedIds, folders).length;

  return createPortal(
    <div className="kb-modal-overlay" onClick={onClose}>
      <div
        className="kb-modal-card sync-folder-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="kb-modal-title">Select folders to synchronize</h3>
        <p className="kb-modal-description">
          Choose one or more folders, or synchronize the entire knowledge base. Selecting a
          parent folder also selects all subfolders. Only changed markdown files are re-indexed.
        </p>

        {error && <div className="sync-folder-error">{error}</div>}

        <label className="sync-folder-option sync-folder-all">
          <input
            type="checkbox"
            checked={syncAll}
            onChange={(event) => handleSyncAllChange(event.target.checked)}
          />
          <span className="sync-folder-option-label">
            <strong>All folders</strong>
            <span className="sync-folder-option-path">Full knowledge base</span>
          </span>
        </label>

        <div className="sync-folder-list" aria-busy={loading}>
          {loading ? (
            <div className="sync-folder-loading">Loading folders...</div>
          ) : folders.length === 0 ? (
            <div className="sync-folder-empty">No folders found in the knowledge base.</div>
          ) : (
            folders.map((folder) => (
              <label
                key={folder._id}
                className={`sync-folder-option${syncAll ? ' disabled' : ''}`}
                style={{ paddingLeft: `${12 + folder.depth * 16}px` }}
              >
                <input
                  type="checkbox"
                  checked={!syncAll && selectedIds.has(folder._id)}
                  disabled={syncAll}
                  onChange={() => toggleFolder(folder._id)}
                />
                <span className="sync-folder-option-label">
                  <strong>{folder.name}</strong>
                  {folder.path ? (
                    <span className="sync-folder-option-path">{folder.path}</span>
                  ) : null}
                </span>
              </label>
            ))
          )}
        </div>

        {!syncAll && selectedIds.size > 0 && (
          <p className="sync-folder-selection-count">
            {selectedIds.size} folder{selectedIds.size === 1 ? '' : 's'} selected
            {rootSelectionCount < selectedIds.size &&
              ` (${rootSelectionCount} root folder${rootSelectionCount === 1 ? '' : 's'})`}
          </p>
        )}

        <div className="kb-modal-actions">
          <button type="button" className="kb-modal-btn cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="kb-modal-btn submit"
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
          >
            Start synchronization
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default SyncFolderModal;
