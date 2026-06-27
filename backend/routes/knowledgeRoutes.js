const express = require('express');
const { getDataSources, addDataSource, getFiles, uploadFile, editDataSource, deleteDataSource, deleteFile, editFile, viewFileContent, getBucketSize } = require('../controllers/knowledgeController');
const { synchronizeKnowledgeBase, getLatestSyncReport, listSyncReports, getKnowledgeSyncProgress, getActiveKnowledgeSync, listSyncFolders } = require('../controllers/knowledgeSyncController');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// Apply auth + admin middlewares to all knowledge base endpoints
router.use(protect);
router.use(admin);

router.get('/data-sources', getDataSources);
router.post('/data-sources', addDataSource);
router.put('/data-sources/:id', editDataSource);
router.delete('/data-sources/:id', deleteDataSource);
router.get('/files', getFiles);
router.post('/files', uploadFile);
router.put('/files/:id', editFile);
router.delete('/files/:id', deleteFile);
router.get('/files/:id/view', viewFileContent);
router.get('/storage-size', getBucketSize);
router.post('/sync', synchronizeKnowledgeBase);
router.get('/sync/folders', listSyncFolders);
router.get('/sync/progress/:syncId', getKnowledgeSyncProgress);
router.get('/sync/active', getActiveKnowledgeSync);
router.get('/sync/latest', getLatestSyncReport);
router.get('/sync/reports', listSyncReports);

module.exports = router;
