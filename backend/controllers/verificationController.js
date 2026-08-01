const Deployment = require('../models/Deployment');
const Analysis = require('../models/Analysis');
const DeploymentVerification = require('../models/DeploymentVerification');
const { discoverAuthRoutes, GithubFileError } = require('../services/githubFileService');
const deploymentVerificationAgent = require('../agents/deploymentVerificationAgent');

function serializeVerification(doc) {
  return {
    id: doc._id,
    deploymentId: doc.deploymentId,
    repoUrl: doc.repoUrl,
    status: doc.status,
    testPlan: doc.testPlan,
    attempt: doc.attempt,
    maxAttempts: doc.maxAttempts,
    checks: doc.checks,
    attemptHistory: doc.attemptHistory,
    testAccount: doc.testAccount,
    finalReport: doc.finalReport,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

const getPlan = async (req, res) => {
  const { deploymentId, githubToken } = req.body;
  if (!deploymentId) {
    return res.status(400).json({ message: 'deploymentId is required.' });
  }
  if (!githubToken) {
    return res.status(401).json({ message: 'A GitHub token is required to infer the verification test plan.' });
  }

  try {
    const deployment = await Deployment.findOne({ _id: deploymentId, userId: req.user._id });
    if (!deployment) return res.status(404).json({ message: 'Deployment not found.' });
    if (deployment.status !== 'succeeded') {
      return res.status(400).json({ message: 'Only a succeeded deployment can be verified.' });
    }

    const analysis = await Analysis.findOne({ userId: req.user._id, repoUrl: deployment.repoUrl, status: 'completed' });
    if (!analysis) {
      return res.status(404).json({ message: 'No completed analysis found for this repository.' });
    }

    const { candidateFiles } = await discoverAuthRoutes(deployment.repoUrl, githubToken);
    const testPlan = await deploymentVerificationAgent.inferTestPlan({
      analysisResult: analysis.result,
      candidateFiles,
    });

    return res.status(200).json({ testPlan });
  } catch (err) {
    if (err instanceof GithubFileError) {
      return res.status(err.statusCode || 502).json({ message: err.message });
    }
    if (err instanceof deploymentVerificationAgent.DeploymentVerificationError) {
      return res.status(err.statusCode || 503).json({ message: err.message });
    }
    console.error('Failed to build verification test plan:', err);
    return res.status(500).json({ message: 'Failed to build the verification test plan.' });
  }
};

const startVerification = async (req, res) => {
  const { deploymentId, testPlan } = req.body;
  if (!deploymentId || !testPlan) {
    return res.status(400).json({ message: 'deploymentId and testPlan are required.' });
  }

  try {
    const deployment = await Deployment.findOne({ _id: deploymentId, userId: req.user._id });
    if (!deployment) return res.status(404).json({ message: 'Deployment not found.' });
    if (deployment.status !== 'succeeded') {
      return res.status(400).json({ message: 'Only a succeeded deployment can be verified.' });
    }

    const normalizedPlan = deploymentVerificationAgent.normalizeTestPlan(testPlan);

    const verification = await DeploymentVerification.create({
      userId: req.user._id,
      deploymentId,
      repoUrl: deployment.repoUrl,
      status: 'running',
      testPlan: normalizedPlan,
      attempt: 0,
      checks: deploymentVerificationAgent.buildInitialChecks(normalizedPlan),
    });

    deploymentVerificationAgent.startVerification(verification._id);

    return res.status(202).json({ verificationId: verification._id });
  } catch (err) {
    console.error('Failed to start deployment verification:', err);
    return res.status(500).json({ message: 'Failed to start verification. Please try again.' });
  }
};

const getVerification = async (req, res) => {
  try {
    const verification = await DeploymentVerification.findOne({ _id: req.params.id, userId: req.user._id });
    if (!verification) return res.status(404).json({ message: 'Verification not found.' });
    return res.status(200).json({ verification: serializeVerification(verification) });
  } catch (err) {
    console.error('Failed to load verification:', err);
    return res.status(500).json({ message: 'Failed to load this verification.' });
  }
};

const listVerifications = async (req, res) => {
  const { deploymentId } = req.query;
  if (!deploymentId) return res.status(400).json({ message: 'deploymentId is required.' });

  try {
    const verifications = await DeploymentVerification.find({ userId: req.user._id, deploymentId }).sort({ createdAt: -1 }).limit(10);
    return res.status(200).json({ verifications: verifications.map(serializeVerification) });
  } catch (err) {
    console.error('Failed to list verifications:', err);
    return res.status(500).json({ message: 'Failed to load verification history.' });
  }
};

const stopVerification = async (req, res) => {
  try {
    await deploymentVerificationAgent.requestStop(req.params.id, req.user._id);
    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    if (err instanceof deploymentVerificationAgent.DeploymentVerificationError) {
      return res.status(err.statusCode || 400).json({ message: err.message });
    }
    console.error('Failed to stop verification:', err);
    return res.status(500).json({ message: 'Failed to stop this verification.' });
  }
};

module.exports = { getPlan, startVerification, getVerification, listVerifications, stopVerification };
