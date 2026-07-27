const Analysis = require('../models/Analysis');
const PlatformInterview = require('../models/PlatformInterview');
const ArchitectureRecommendation = require('../models/ArchitectureRecommendation');
const Deployment = require('../models/Deployment');
const PlatformCredential = require('../models/PlatformCredential');
const deploymentAgent = require('../agents/deploymentAgent');

async function loadGatingDocs(userId, repoUrl) {
  const analysis = await Analysis.findOne({ userId, repoUrl, status: 'completed' });
  if (!analysis) {
    return { error: { status: 404, message: 'No completed analysis found for this repository. Run repository analysis first.' } };
  }
  const platformInterview = await PlatformInterview.findOne({ userId, repoUrl, status: 'completed' });
  if (!platformInterview) {
    return { error: { status: 404, message: 'Complete the platform selection interview for this repository first.' } };
  }
  const architectureRecommendation = await ArchitectureRecommendation.findOne({ userId, repoUrl, status: 'completed' });
  if (!architectureRecommendation) {
    return { error: { status: 404, message: 'Generate architecture options for this repository first.' } };
  }
  return { analysis, platformInterview, architectureRecommendation };
}

function findOption(architectureRecommendation, architectureOptionId) {
  const options = (architectureRecommendation.result && architectureRecommendation.result.options) || [];
  return options.find((o) => o.id === architectureOptionId);
}

function serializeDeployment(doc) {
  return {
    id: doc._id,
    repoUrl: doc.repoUrl,
    repoFullName: doc.repoFullName,
    architectureOptionId: doc.architectureOptionId,
    status: doc.status,
    steps: doc.steps,
    resources: doc.resources,
    finalLinks: doc.finalLinks,
    error: doc.error,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    completedAt: doc.completedAt,
  };
}

const getPlan = async (req, res) => {
  const { repoUrl, architectureOptionId } = req.body;
  if (!repoUrl || !architectureOptionId) {
    return res.status(400).json({ message: 'repoUrl and architectureOptionId are required.' });
  }

  try {
    const gated = await loadGatingDocs(req.user._id, repoUrl);
    if (gated.error) return res.status(gated.error.status).json({ message: gated.error.message });

    const architectureOption = findOption(gated.architectureRecommendation, architectureOptionId);
    if (!architectureOption) {
      return res.status(404).json({ message: 'Unknown architecture option. Regenerate architecture options and try again.' });
    }

    const plan = deploymentAgent.buildDeploymentPlan({
      analysis: gated.analysis,
      platformInterview: gated.platformInterview,
      architectureOption,
    });

    return res.status(200).json({ plan, architectureOption });
  } catch (err) {
    console.error('Failed to build deployment plan:', err);
    return res.status(500).json({ message: 'Failed to build the deployment plan.' });
  }
};

const startDeployment = async (req, res) => {
  const { repoUrl, architectureOptionId, plan } = req.body;
  if (!repoUrl || !architectureOptionId || !plan) {
    return res.status(400).json({ message: 'repoUrl, architectureOptionId, and plan are required.' });
  }

  try {
    const gated = await loadGatingDocs(req.user._id, repoUrl);
    if (gated.error) return res.status(gated.error.status).json({ message: gated.error.message });

    const architectureOption = findOption(gated.architectureRecommendation, architectureOptionId);
    if (!architectureOption) {
      return res.status(404).json({ message: 'Unknown architecture option. Regenerate architecture options and try again.' });
    }

    const deployableComponents = (plan.components || []).filter((c) => c.deployable);
    if (deployableComponents.length === 0) {
      return res.status(400).json({ message: 'This plan has no deployable components.' });
    }

    const requiredPlatforms = [...new Set(deployableComponents.map((c) => c.platform))];
    const connected = await PlatformCredential.find({ userId: req.user._id, platform: { $in: requiredPlatforms } });
    const connectedPlatforms = new Set(connected.map((c) => c.platform));
    const missing = requiredPlatforms.filter((p) => !connectedPlatforms.has(p));
    if (missing.length > 0) {
      return res.status(400).json({ message: `Connect your ${missing.join(' and ')} API key before starting this deployment.` });
    }

    const deployment = await Deployment.create({
      userId: req.user._id,
      repoUrl,
      repoFullName: gated.analysis.repoFullName,
      architectureOptionId,
      architectureSnapshot: architectureOption,
      plan,
      status: 'running',
      steps: deploymentAgent.buildInitialSteps(plan),
    });

    deploymentAgent.startDeployment(deployment._id);

    return res.status(202).json({ deploymentId: deployment._id });
  } catch (err) {
    console.error('Failed to start deployment:', err);
    return res.status(500).json({ message: 'Failed to start the deployment. Please try again.' });
  }
};

const getDeployment = async (req, res) => {
  try {
    const deployment = await Deployment.findOne({ _id: req.params.id, userId: req.user._id });
    if (!deployment) return res.status(404).json({ message: 'Deployment not found.' });
    return res.status(200).json({ deployment: serializeDeployment(deployment) });
  } catch (err) {
    console.error('Failed to load deployment:', err);
    return res.status(500).json({ message: 'Failed to load this deployment.' });
  }
};

const listDeployments = async (req, res) => {
  const { repoUrl } = req.query;
  if (!repoUrl) return res.status(400).json({ message: 'repoUrl is required.' });

  try {
    const deployments = await Deployment.find({ userId: req.user._id, repoUrl }).sort({ createdAt: -1 }).limit(20);
    return res.status(200).json({ deployments: deployments.map(serializeDeployment) });
  } catch (err) {
    console.error('Failed to list deployments:', err);
    return res.status(500).json({ message: 'Failed to load deployment history.' });
  }
};

const stopDeployment = async (req, res) => {
  try {
    await deploymentAgent.requestStop(req.params.id, req.user._id);
    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    if (err instanceof deploymentAgent.DeploymentAgentError) {
      return res.status(err.statusCode || 400).json({ message: err.message });
    }
    console.error('Failed to stop deployment:', err);
    return res.status(500).json({ message: 'Failed to stop this deployment.' });
  }
};

const rollbackDeployment = async (req, res) => {
  try {
    await deploymentAgent.requestRollback(req.params.id, req.user._id);
    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    if (err instanceof deploymentAgent.DeploymentAgentError) {
      return res.status(err.statusCode || 400).json({ message: err.message });
    }
    console.error('Failed to roll back deployment:', err);
    return res.status(500).json({ message: 'Failed to roll back this deployment.' });
  }
};

const updateEnvVars = async (req, res) => {
  const { componentName, envVars } = req.body;
  if (!componentName || !Array.isArray(envVars)) {
    return res.status(400).json({ message: 'componentName and envVars are required.' });
  }

  try {
    const deployment = await Deployment.findOne({ _id: req.params.id, userId: req.user._id });
    if (!deployment) return res.status(404).json({ message: 'Deployment not found.' });
    if (deployment.status !== 'succeeded') {
      return res.status(400).json({ message: 'Environment variables can only be edited for a succeeded deployment.' });
    }

    const cleaned = envVars
      .map((v) => ({ key: String(v?.key || '').trim(), value: String(v?.value ?? '') }))
      .filter((v) => v.key.length > 0);

    deploymentAgent.updateComponentEnvVars(deployment._id, componentName, cleaned);

    return res.status(202).json({ status: 'started' });
  } catch (err) {
    console.error('Failed to update deployment env vars:', err);
    return res.status(500).json({ message: 'Failed to update environment variables.' });
  }
};

module.exports = {
  getPlan,
  startDeployment,
  getDeployment,
  listDeployments,
  stopDeployment,
  rollbackDeployment,
  updateEnvVars,
};
