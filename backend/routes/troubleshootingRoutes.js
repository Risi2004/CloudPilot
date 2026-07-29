const express = require('express');
const {
  diagnoseFailure,
  generateFix,
  approveFix,
  autoFix,
  resolveManual,
  getTroubleshooting,
  listTroubleshooting,
  stopTroubleshooting,
} = require('../controllers/troubleshootingController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', listTroubleshooting);
router.post('/diagnose', diagnoseFailure);
router.get('/:id', getTroubleshooting);
router.post('/:id/generate-fix', generateFix);
router.post('/:id/approve-fix', approveFix);
router.post('/:id/auto-fix', autoFix);
router.post('/:id/manual', resolveManual);
router.post('/:id/stop', stopTroubleshooting);

module.exports = router;
