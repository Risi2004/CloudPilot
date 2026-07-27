const express = require('express');
const {
  getPlan,
  startDeployment,
  getDeployment,
  listDeployments,
  stopDeployment,
  rollbackDeployment,
  updateEnvVars,
} = require('../controllers/deploymentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', listDeployments);
router.post('/plan', getPlan);
router.post('/start', startDeployment);
router.get('/:id', getDeployment);
router.post('/:id/stop', stopDeployment);
router.post('/:id/rollback', rollbackDeployment);
router.post('/:id/env', updateEnvVars);

module.exports = router;
