import React, { useState, useEffect, useCallback } from 'react';
import './KnowledgeBase.css';

import AdminSidebar from '../../../components/Admin/AdminDashboard/AdminSidebar';
import VectorStats from '../../../components/Admin/KnowledgeBase/VectorStats';
import ConnectorList from '../../../components/Admin/KnowledgeBase/ConnectorList';
import OptimizationInsight from '../../../components/Admin/KnowledgeBase/OptimizationInsight';
import SyncReportPanel from '../../../components/Admin/KnowledgeBase/SyncReportPanel';
import SyncProgressPanel from '../../../components/Admin/KnowledgeBase/SyncProgressPanel';
import SyncFolderModal from '../../../components/Admin/KnowledgeBase/SyncFolderModal';
import '../../../components/Admin/KnowledgeBase/SyncReportPanel.css';
import {
  startKnowledgeSync,
  waitForKnowledgeSync,
  getActiveKnowledgeSync,
  getLatestSyncReport,
  formatSyncTimestamp,
} from '../../../services/knowledgeSync';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DEFAULT_EXPLORER_FOLDER = {
  dataSourceId: null,
  folderKey: 'knowledge-base/',
  label: 'All folders',
};

function KnowledgeBase() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [explorerFolder, setExplorerFolder] = useState(DEFAULT_EXPLORER_FOLDER);
  const [syncProgress, setSyncProgress] = useState(null);
  const [syncReport, setSyncReport] = useState(null);
  const [syncSummary, setSyncSummary] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [storageSize, setStorageSize] = useState('-');
  const [mdFileCount, setMdFileCount] = useState('-');
  const [totalVectors, setTotalVectors] = useState('-');
  const [lastSyncedAt, setLastSyncedAt] = useState('-');
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchStorageSize = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/knowledge/storage-size`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setStorageSize(data.storageSize);
        setMdFileCount(data.mdFileCount);
      }
    } catch (e) {
      console.error('Error fetching storage size:', e);
    }
  }, []);

  const fetchLatestSync = useCallback(async () => {
    try {
      const data = await getLatestSyncReport();
      setTotalVectors(data.totalVectors ?? 0);
      setLastSyncedAt(formatSyncTimestamp(data.lastSyncedAt));
      if (data.latestReport) {
        setSyncReport(data.latestReport);
      }
    } catch (e) {
      console.error('Error fetching sync stats:', e);
    }
  }, []);

  const resumeSyncPolling = useCallback(async (syncId) => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      const result = await waitForKnowledgeSync(syncId, {
        onProgress: setSyncProgress,
      });
      setSyncReport(result.report);
      setSyncSummary(result.summary);
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setSyncError(err.message || 'Knowledge synchronization failed.');
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  }, []);

  useEffect(() => {
    fetchStorageSize();
    fetchLatestSync();
  }, [fetchStorageSize, fetchLatestSync, refreshKey]);

  useEffect(() => {
    let cancelled = false;

    const checkActiveSync = async () => {
      try {
        const data = await getActiveKnowledgeSync();
        if (cancelled || !data.active || !data.progress?.syncId) return;
        await resumeSyncPolling(data.progress.syncId);
      } catch (e) {
        console.error('Error checking active sync:', e);
      }
    };

    checkActiveSync();

    return () => {
      cancelled = true;
    };
  }, [resumeSyncPolling]);

  const runSynchronization = async (syncOptions) => {
    if (isSyncing) return;

    setIsSyncing(true);
    setSyncError(null);
    setSyncProgress({
      status: 'running',
      phaseLabel: 'Starting synchronization...',
      progressPercent: 0,
      elapsedMs: 0,
    });

    try {
      const { syncId } = await startKnowledgeSync(syncOptions);
      const result = await waitForKnowledgeSync(syncId, {
        onProgress: setSyncProgress,
      });
      setSyncReport(result.report);
      setSyncSummary(result.summary);
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setSyncError(err.message || 'Knowledge synchronization failed.');
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  const handleSynchronizeClick = () => {
    if (isSyncing) return;
    setShowSyncModal(true);
  };

  const handleSyncConfirm = async ({ syncAll, dataSourceIds }) => {
    setShowSyncModal(false);
    await runSynchronization(syncAll ? { syncAll: true } : { dataSourceIds });
  };

  return (
    <div className="admin-dashboard-container">
      <AdminSidebar activeTab="knowledge-base" />

      <main className="admin-dashboard-main">
        <div className="admin-subview">
          <div className="knowledge-header-row">
            <div className="header-left">
              <span className="kb-super-label">SEMANTIC INDEXING</span>
              <h1 className="knowledge-page-title">Neural Repository</h1>
            </div>

            <div className="header-right">
              <div className="sync-action-group">
                <button
                  type="button"
                  className="kb-action-btn primary"
                  onClick={handleSynchronizeClick}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <span className="rebuilding-spinner-text">
                      <svg className="kb-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <circle cx="12" cy="12" r="10" strokeDasharray="40 20" strokeLinecap="round" />
                      </svg>
                      Synchronizing...
                    </span>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="btn-icon">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                      </svg>
                      Synchronize Database
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <SyncFolderModal
            open={showSyncModal}
            onClose={() => setShowSyncModal(false)}
            onConfirm={handleSyncConfirm}
            initialFolderId={explorerFolder.dataSourceId}
          />

          {syncError && <div className="knowledge-sync-error">{syncError}</div>}

          {isSyncing && <SyncProgressPanel progress={syncProgress} />}

          <div className="knowledge-stats-row">
            <VectorStats
              storageCapacity={storageSize}
              mdFileCount={mdFileCount}
              totalVectors={totalVectors}
              lastSyncedAt={lastSyncedAt}
            />
          </div>

          <SyncReportPanel report={syncReport} summary={syncSummary} />

          <div className="knowledge-explorer-row">
            <ConnectorList
              onContentsChanged={fetchStorageSize}
              onExplorerFolderChange={setExplorerFolder}
            />
          </div>

          <div className="knowledge-insight-row">
            <OptimizationInsight />
          </div>
        </div>
      </main>
    </div>
  );
}

export default KnowledgeBase;
