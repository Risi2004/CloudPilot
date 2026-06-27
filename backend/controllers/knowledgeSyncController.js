const {
  startKnowledgeSyncJob,
  getLatestSyncStats,
  getSyncProgress,
  getActiveSyncJob,
  listSyncFolderOptions,
} = require('../services/knowledgeSyncService');
const KnowledgeSyncReport = require('../models/KnowledgeSyncReport');

const synchronizeKnowledgeBase = async (req, res, next) => {
  try {
    const { syncAll, dataSourceIds, dataSourceId, folderPrefix, scopeLabel } = req.body || {};
    const job = await startKnowledgeSyncJob(req.user._id, {
      syncAll: Boolean(syncAll),
      dataSourceIds: dataSourceIds || (dataSourceId ? [dataSourceId] : undefined),
      dataSourceId: dataSourceId || null,
      folderPrefix: folderPrefix || null,
      scopeLabel: scopeLabel || null,
    });
    res.status(202).json({
      message: 'Knowledge synchronization started.',
      syncId: job.syncId,
      scopeLabel: job.scopeLabel,
    });
  } catch (err) {
    if (err.code === 'SYNC_IN_PROGRESS') {
      return res.status(409).json({
        message: err.message,
        syncId: err.syncId,
      });
    }
    next(err);
  }
};

const getKnowledgeSyncProgress = async (req, res, next) => {
  try {
    const progress = getSyncProgress(req.params.syncId);
    if (!progress) {
      return res.status(404).json({ message: 'Sync job not found.' });
    }
    return res.status(200).json(progress);
  } catch (err) {
    next(err);
  }
};

const getActiveKnowledgeSync = async (req, res, next) => {
  try {
    const progress = getActiveSyncJob();
    res.status(200).json({ active: Boolean(progress), progress });
  } catch (err) {
    next(err);
  }
};

const getLatestSyncReport = async (req, res, next) => {
  try {
    const stats = await getLatestSyncStats();
    res.status(200).json(stats);
  } catch (err) {
    next(err);
  }
};

const listSyncReports = async (req, res, next) => {
  try {
    const reports = await KnowledgeSyncReport.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('triggeredBy', 'fullName email');
    res.status(200).json({ reports });
  } catch (err) {
    next(err);
  }
};

const listSyncFolders = async (req, res, next) => {
  try {
    const folders = await listSyncFolderOptions();
    res.status(200).json({ folders });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  synchronizeKnowledgeBase,
  getKnowledgeSyncProgress,
  getActiveKnowledgeSync,
  getLatestSyncReport,
  listSyncReports,
  listSyncFolders,
};
