const Analysis = require('../models/Analysis');
const { fetchProjectMetadataFiles, scanRepoSource, GithubFileError } = require('../services/githubFileService');
const { runCodeAnalysisAgent, AnalysisError } = require('../agents/codeAnalysisAgent');
const { runDeploymentReadinessCheck } = require('../agents/deploymentReadinessAgent');

// Merge the LLM's guessed env vars (e.g. "DATABASE_URL (Postgres link)") with keys
// actually found by scanning source code, de-duping case-insensitively on the key.
function mergeEnvVariables(llmList, scannedList) {
  const merged = new Map();

  for (const entry of llmList || []) {
    if (typeof entry !== 'string' || !entry.trim()) continue;
    const key = entry.split(' ')[0].trim();
    if (!key) continue;
    merged.set(key.toUpperCase(), entry.trim());
  }

  for (const { key, files } of scannedList || []) {
    const upperKey = key.toUpperCase();
    if (merged.has(upperKey)) continue;
    const sourceHint = files && files.length ? `(found in ${files[0]})` : '(found in source code)';
    merged.set(upperKey, `${key} ${sourceHint}`);
  }

  return Array.from(merged.values());
}

const analyzeRepository = async (req, res) => {
  const { repoUrl, githubToken, force } = req.body;

  if (!repoUrl) {
    return res.status(400).json({ message: 'repoUrl is required.' });
  }
  if (!githubToken) {
    return res.status(401).json({ message: 'A GitHub token is required to analyze this repository.' });
  }

  try {
    if (!force) {
      const cached = await Analysis.findOne({ userId: req.user._id, repoUrl, status: 'completed' });
      if (cached) {
        return res.status(200).json({
          status: 'cached',
          repoUrl: cached.repoUrl,
          repoFullName: cached.repoFullName,
          detectedFiles: cached.detectedFiles,
          result: cached.result,
          analyzedAt: cached.updatedAt,
          envConfigured: cached.envConfigured,
          envVariables: cached.envVariables,
          deploymentReadiness: cached.deploymentReadiness,
        });
      }
    }

    const { detectedFiles, repoFullName } = await fetchProjectMetadataFiles(repoUrl, githubToken);

    if (detectedFiles.length === 0) {
      return res.status(422).json({
        message: 'No recognizable project metadata files (package.json, requirements.txt, etc.) were found in this repository.',
      });
    }

    const result = await runCodeAnalysisAgent({
      repoUrl,
      files: detectedFiles,
      userId: String(req.user._id),
    });

    let scannedEnvVars = [];
    let secretFindings = [];
    let localhostFindings = [];
    try {
      const scanned = await scanRepoSource(repoUrl, githubToken);
      scannedEnvVars = scanned.envVars;
      secretFindings = scanned.secretFindings;
      localhostFindings = scanned.localhostFindings;
    } catch (scanErr) {
      console.error('Repository source scan failed (non-fatal):', scanErr.message);
    }

    result.buildRequirements = result.buildRequirements || {};
    result.buildRequirements.envVariables = mergeEnvVariables(
      result.buildRequirements.envVariables,
      scannedEnvVars
    );

    let deploymentReadiness = null;
    try {
      deploymentReadiness = await runDeploymentReadinessCheck({
        detectedFiles,
        analysisResult: result,
        secretFindings,
        localhostFindings,
      });
    } catch (readinessErr) {
      console.error('Deployment Readiness Agent failed (non-fatal):', readinessErr.message);
    }

    const detectedFilePaths = detectedFiles.map((f) => f.path);

    const saved = await Analysis.findOneAndUpdate(
      { userId: req.user._id, repoUrl },
      {
        userId: req.user._id,
        repoUrl,
        repoFullName,
        detectedFiles: detectedFilePaths,
        result,
        deploymentReadiness,
        status: 'completed',
        errorMessage: null,
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      status: 'completed',
      repoUrl: saved.repoUrl,
      repoFullName: saved.repoFullName,
      detectedFiles: saved.detectedFiles,
      result: saved.result,
      analyzedAt: saved.updatedAt,
      envConfigured: saved.envConfigured,
      envVariables: saved.envVariables,
      deploymentReadiness: saved.deploymentReadiness,
    });
  } catch (err) {
    if (err instanceof GithubFileError) {
      return res.status(err.statusCode || 502).json({ message: err.message });
    }
    if (err instanceof AnalysisError) {
      return res.status(503).json({ message: err.message });
    }
    console.error('Code Analysis Agent error:', err);
    return res.status(500).json({ message: 'Failed to analyze repository. Please try again.' });
  }
};

const saveEnvVariables = async (req, res) => {
  const { repoUrl, variables } = req.body;

  if (!repoUrl) {
    return res.status(400).json({ message: 'repoUrl is required.' });
  }
  if (!Array.isArray(variables)) {
    return res.status(400).json({ message: 'variables must be an array of { key, value }.' });
  }

  const cleaned = variables
    .map((v) => ({
      key: String(v?.key || '').trim(),
      value: String(v?.value ?? ''),
      scope: v?.scope ? String(v.scope).trim() : null,
    }))
    .filter((v) => v.key.length > 0);

  if (cleaned.length === 0) {
    return res.status(400).json({ message: 'At least one environment variable key is required.' });
  }

  try {
    const updated = await Analysis.findOneAndUpdate(
      { userId: req.user._id, repoUrl },
      { envVariables: cleaned, envConfigured: true },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'No analysis found for this repository. Run analysis first.' });
    }

    return res.status(200).json({
      status: 'ok',
      envVariables: updated.envVariables,
      envConfigured: updated.envConfigured,
    });
  } catch (err) {
    console.error('Failed to save environment variables:', err);
    return res.status(500).json({ message: 'Failed to save environment variables. Please try again.' });
  }
};

module.exports = { analyzeRepository, saveEnvVariables };
