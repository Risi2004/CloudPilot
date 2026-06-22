const express = require('express');
const { getDataSources, addDataSource, getFiles, uploadFile, editDataSource, deleteDataSource, deleteFile, editFile, viewFileContent, getBucketSize } = require('../controllers/knowledgeController');
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

module.exports = router;
