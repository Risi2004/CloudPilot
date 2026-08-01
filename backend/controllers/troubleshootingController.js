const DeploymentTroubleshooting = require('../models/DeploymentTroubleshooting');
const { GithubFileError } = require('../services/githubFileService');
const deploymentTroubleshootingAgent = require('../agents/deploymentTroubleshootingAgent');

function serializeTroubleshooting(doc) {
  return {
    id: doc._id,
    deploymentId: doc.deploymentId,
    repoUrl: doc.repoUrl,
    status: doc.status,
    attempt: doc.attempt,
    maxAttempts: doc.maxAttempts,
    diagnosis: doc.diagnosis,
    proposedFix: doc.proposedFix,
    attemptHistory: doc.attemptHistory,
    resolution: doc.resolution,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function handleAgentError(err, res, fallbackMessage) {
  if (err instanceof deploymentTroubleshootingAgent.DeploymentTroubleshootingError) {
    return res.status(err.statusCode || 400).json({ message: err.message });
  }
  if (err instanceof GithubFileError) {
    return res.status(err.statusCode || 502).json({ message: err.message });
  }
  console.error(fallbackMessage, err);
  return res.status(500).json({ message: fallbackMessage });
}

const diagnoseFailure = async (req, res) => {
  const { deploymentId } = req.body;
  if (!deploymentId) {
    return res.status(400).json({ message: 'deploymentId is required.' });
  }

  try {
    const doc = await deploymentTroubleshootingAgent.diagnose({ deploymentId, userId: req.user._id });
    return res.status(200).json({ troubleshooting: serializeTroubleshooting(doc) });
  } catch (err) {
    return handleAgentError(err, res, 'Failed to diagnose this deployment failure.');
  }
};

const generateFix = async (req, res) => {
  const { githubToken } = req.body;
  try {
    const doc = await deploymentTroubleshootingAgent.generateCodeFix(req.params.id, req.user._id, githubToken);
    return res.status(200).json({ troubleshooting: serializeTroubleshooting(doc) });
  } catch (err) {
    return handleAgentError(err, res, 'Failed to generate a code fix.');
  }
};

const approveFix = async (req, res) => {
  const { githubToken } = req.body;
  if (!githubToken) {
    return res.status(401).json({ message: 'A GitHub token is required to push the approved fix.' });
  }

  try {
    const doc = await DeploymentTroubleshooting.findOne({ _id: req.params.id, userId: req.user._id });
    if (!doc) return res.status(404).json({ message: 'Troubleshooting session not found.' });
    if (!doc.proposedFix || !doc.proposedFix.files || !doc.proposedFix.files.length) {
      return res.status(400).json({ message: 'No proposed fix is pending approval.' });
    }

    deploymentTroubleshootingAgent.startAutoFix(doc._id, { githubToken });
    return res.status(202).json({ troubleshootingId: doc._id });
  } catch (err) {
    return handleAgentError(err, res, 'Failed to approve and push this fix.');
  }
};

const autoFix = async (req, res) => {
  try {
    const doc = await DeploymentTroubleshooting.findOne({ _id: req.params.id, userId: req.user._id });
    if (!doc) return res.status(404).json({ message: 'Troubleshooting session not found.' });
    if (!doc.diagnosis || doc.diagnosis.category !== 'env') {
      return res.status(400).json({ message: 'Only an environment-variable-only diagnosis can be auto-fixed directly.' });
    }

    deploymentTroubleshootingAgent.startAutoFix(doc._id, {});
    return res.status(202).json({ troubleshootingId: doc._id });
  } catch (err) {
    return handleAgentError(err, res, 'Failed to start the automatic fix.');
  }
};

const resolveManual = async (req, res) => {
  try {
    const doc = await deploymentTroubleshootingAgent.resolveManual(req.params.id, req.user._id);
    return res.status(200).json({ troubleshooting: serializeTroubleshooting(doc) });
  } catch (err) {
    return handleAgentError(err, res, 'Failed to mark this session as manually resolved.');
  }
};

const getTroubleshooting = async (req, res) => {
  try {
    const doc = await DeploymentTroubleshooting.findOne({ _id: req.params.id, userId: req.user._id });
    if (!doc) return res.status(404).json({ message: 'Troubleshooting session not found.' });
    return res.status(200).json({ troubleshooting: serializeTroubleshooting(doc) });
  } catch (err) {
    console.error('Failed to load troubleshooting session:', err);
    return res.status(500).json({ message: 'Failed to load this troubleshooting session.' });
  }
};

const listTroubleshooting = async (req, res) => {
  const { deploymentId } = req.query;
  if (!deploymentId) return res.status(400).json({ message: 'deploymentId is required.' });

  try {
    const docs = await DeploymentTroubleshooting.find({ userId: req.user._id, deploymentId }).sort({ createdAt: -1 }).limit(10);
    return res.status(200).json({ troubleshooting: docs.map(serializeTroubleshooting) });
  } catch (err) {
    console.error('Failed to list troubleshooting sessions:', err);
    return res.status(500).json({ message: 'Failed to load troubleshooting history.' });
  }
};

const stopTroubleshooting = async (req, res) => {
  try {
    await deploymentTroubleshootingAgent.requestStop(req.params.id, req.user._id);
    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    return handleAgentError(err, res, 'Failed to stop this troubleshooting session.');
  }
};

module.exports = {
  diagnoseFailure,
  generateFix,
  approveFix,
  autoFix,
  resolveManual,
  getTroubleshooting,
  listTroubleshooting,
  stopTroubleshooting,
};
