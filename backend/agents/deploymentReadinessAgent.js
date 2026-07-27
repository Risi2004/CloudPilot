const { LlmAgent, InMemoryRunner, isFinalResponse, stringifyContent } = require('@google/adk');
const { RunpodModel } = require('../adk/runpodModel');

const TRUNCATION_MARKER = '...[truncated]';
const SUPPORTED_NODE_MAJORS = [18, 20, 22];

// Fixed importance weight per check (sums to 100), independent of the pass/warning/fail
// outcome - used to compute the overall score. A "fail" deducts the full weight, a
// "warning" deducts half; "pass"/not-applicable deducts nothing.
const CHECK_WEIGHT = {
  env_example: 8,
  package_json_valid: 15,
  build_start_scripts: 15,
  dependencies_present: 8,
  secrets_committed: 25,
  dockerfile_present: 8,
  hardcoded_localhost: 8,
  node_version_supported: 8,
  production_config: 5,
};

const SYSTEM_INSTRUCTION = `You are the Deployment Readiness Agent inside CloudPilot, an autonomous cloud deployment assistant.

You will be given a JSON array of deployment-readiness checks that were already computed deterministically by code (pass/warning/fail with a severity and message for each). Do NOT re-judge, add, remove, or contradict any check. Your only job is to write a short, plain-English narrative on top of them and respond with a single JSON object and NOTHING else - no markdown code fences, no prose before or after.

Respond with EXACTLY this JSON shape:

{
  "summary": "string - 2 to 4 sentences summarizing the overall deployment readiness in plain English, referencing the most important findings",
  "topRecommendations": ["string - up to 3 short, concrete, prioritized action items, worst issue first"]
}`;

let agentSingleton = null;
let runnerSingleton = null;

function getRunner() {
  if (runnerSingleton) return runnerSingleton;

  const baseUrl = process.env.RUNPOD_BASE_URL;
  const apiKey = process.env.RUNPOD_API_KEY;
  const model = process.env.RUNPOD_MODEL || 'qwen3:14b';

  if (!baseUrl || !apiKey) {
    throw new Error('RunPod is not configured.');
  }

  const runpodModel = new RunpodModel({ model, baseUrl, apiKey });

  agentSingleton = new LlmAgent({
    name: 'deployment_readiness_agent',
    model: runpodModel,
    instruction: SYSTEM_INSTRUCTION,
  });

  runnerSingleton = new InMemoryRunner({
    agent: agentSingleton,
    appName: 'cloudpilot-deployment-readiness',
  });

  return runnerSingleton;
}

function cleanJsonString(str) {
  let cleaned = str;
  // 1. Strip multi-line comments
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // 2. Strip single-line comments (ignoring http:// or https://)
  cleaned = cleaned.replace(/(?:^|[^:])\/\/.*$/gm, (match) => {
    if (match.trim().startsWith('//')) return '';
    const idx = match.indexOf('//');
    if (idx !== -1) return match.slice(0, idx);
    return match;
  });

  // 3. Strip trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

  return cleaned.trim();
}

function extractJson(rawText) {
  let text = rawText.trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) text = fenceMatch[1].trim();

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in response.');
  }
  
  const rawObjString = text.slice(start, end + 1);
  const cleaned = cleanJsonString(rawObjString);
  return JSON.parse(cleaned);
}

function findFile(detectedFiles, matcher) {
  return (detectedFiles || []).find((f) => matcher(f.path.toLowerCase()));
}

function isNodeProject(detectedFiles, analysisResult) {
  const language = (analysisResult && analysisResult.language) || '';
  return Boolean(findFile(detectedFiles, (p) => p.endsWith('package.json'))) ||
    /javascript|typescript|node/i.test(language);
}

function looksLikeStaticSite(analysisResult) {
  const type = (analysisResult && analysisResult.architecture && analysisResult.architecture.type) || '';
  return /static/i.test(type);
}

function parsePackageJson(detectedFiles) {
  const file = findFile(detectedFiles, (p) => p.endsWith('package.json'));
  if (!file) return { file: null, truncated: false, json: null, parseError: null };

  const truncated = file.content.includes(TRUNCATION_MARKER);
  if (truncated) {
    return { file, truncated: true, json: null, parseError: null };
  }

  try {
    return { file, truncated: false, json: JSON.parse(file.content), parseError: null };
  } catch (err) {
    return { file, truncated: false, json: null, parseError: err.message };
  }
}

function checkEnvExample(detectedFiles) {
  const present = Boolean(findFile(detectedFiles, (p) => p.endsWith('.env.example')));
  return {
    id: 'env_example',
    title: 'Missing .env.example',
    status: present ? 'pass' : 'fail',
    severity: present ? 'info' : 'medium',
    message: present
      ? 'A .env.example file is present, documenting required environment variables.'
      : 'No .env.example file was found. New environments and collaborators have no template for required env vars.',
  };
}

function checkPackageJsonValid(nodeProject, pkg) {
  if (!nodeProject) {
    return {
      id: 'package_json_valid',
      title: 'Invalid package.json',
      status: 'pass',
      severity: 'info',
      message: 'Not applicable - this does not look like a Node.js project.',
    };
  }
  if (!pkg.file) {
    return {
      id: 'package_json_valid',
      title: 'Invalid package.json',
      status: 'fail',
      severity: 'critical',
      message: 'This looks like a Node.js project but no package.json was found.',
    };
  }
  if (pkg.truncated) {
    return {
      id: 'package_json_valid',
      title: 'Invalid package.json',
      status: 'warning',
      severity: 'low',
      message: 'package.json is too large to fully validate during analysis (truncated); could not confirm it parses as valid JSON.',
    };
  }
  if (pkg.parseError) {
    return {
      id: 'package_json_valid',
      title: 'Invalid package.json',
      status: 'fail',
      severity: 'critical',
      message: `package.json is not valid JSON: ${pkg.parseError}`,
    };
  }
  return {
    id: 'package_json_valid',
    title: 'Invalid package.json',
    status: 'pass',
    severity: 'info',
    message: 'package.json parses as valid JSON.',
  };
}

function checkBuildAndStartScripts(nodeProject, pkg, analysisResult) {
  if (!nodeProject || !pkg.json) {
    return {
      id: 'build_start_scripts',
      title: 'Missing build scripts / incorrect start command',
      status: 'pass',
      severity: 'info',
      message: 'Not applicable - no parsed package.json available to check.',
    };
  }

  const scripts = pkg.json.scripts || {};
  const framework = (analysisResult && analysisResult.framework) || '';
  const needsBuildStep = /next|react|angular|vite|vue|webpack/i.test(framework);

  if (!scripts.start) {
    return {
      id: 'build_start_scripts',
      title: 'Missing build scripts / incorrect start command',
      status: 'fail',
      severity: 'high',
      message: 'package.json has no "start" script - the platform will not know how to run this app in production.',
    };
  }
  if (needsBuildStep && !scripts.build) {
    return {
      id: 'build_start_scripts',
      title: 'Missing build scripts / incorrect start command',
      status: 'warning',
      severity: 'medium',
      message: `${framework} projects typically need a "build" script, but none was found in package.json.`,
    };
  }
  return {
    id: 'build_start_scripts',
    title: 'Missing build scripts / incorrect start command',
    status: 'pass',
    severity: 'info',
    message: 'package.json defines the scripts needed to build and start this app.',
  };
}

function checkDependenciesPresent(nodeProject, pkg) {
  if (!nodeProject || !pkg.json) {
    return {
      id: 'dependencies_present',
      title: 'Missing dependencies',
      status: 'pass',
      severity: 'info',
      message: 'Not applicable - no parsed package.json available to check.',
    };
  }

  const deps = pkg.json.dependencies || {};
  const hasDeps = Object.keys(deps).length > 0;
  return {
    id: 'dependencies_present',
    title: 'Missing dependencies',
    status: hasDeps ? 'pass' : 'warning',
    severity: hasDeps ? 'info' : 'medium',
    message: hasDeps
      ? `${Object.keys(deps).length} production dependencies declared in package.json.`
      : 'package.json declares no production dependencies - double check this is intentional.',
  };
}

function checkSecretsCommitted(secretFindings) {
  const found = (secretFindings || []).length > 0;
  return {
    id: 'secrets_committed',
    title: 'Secrets committed to Git',
    status: found ? 'fail' : 'pass',
    severity: found ? 'critical' : 'info',
    message: found
      ? `Potential hardcoded secrets found: ${secretFindings.map((s) => `${s.label} (${s.files.slice(0, 2).join(', ')})`).join('; ')}.`
      : 'No hardcoded secrets or committed .env files were detected in the scanned source.',
  };
}

function checkDockerfilePresent(detectedFiles, analysisResult) {
  const present = Boolean(findFile(detectedFiles, (p) => p.endsWith('dockerfile')));
  const startCommand = analysisResult && analysisResult.buildRequirements && analysisResult.buildRequirements.startCommand;
  const required = !looksLikeStaticSite(analysisResult) && startCommand && startCommand !== 'Not detected';

  if (present) {
    return {
      id: 'dockerfile_present',
      title: 'Missing Dockerfile',
      status: 'pass',
      severity: 'info',
      message: 'A Dockerfile is present for containerized deployment.',
    };
  }
  if (!required) {
    return {
      id: 'dockerfile_present',
      title: 'Missing Dockerfile',
      status: 'pass',
      severity: 'info',
      message: 'Not required - this project does not appear to need containerization.',
    };
  }
  return {
    id: 'dockerfile_present',
    title: 'Missing Dockerfile',
    status: 'warning',
    severity: 'medium',
    message: 'This project runs a server process but has no Dockerfile, which most container-based platforms require.',
  };
}

function checkHardcodedLocalhost(localhostFindings) {
  const found = (localhostFindings || []).length > 0;
  return {
    id: 'hardcoded_localhost',
    title: 'Hardcoded localhost URLs',
    status: found ? 'warning' : 'pass',
    severity: found ? 'medium' : 'info',
    message: found
      ? `Hardcoded localhost/127.0.0.1 URLs found in: ${localhostFindings.slice(0, 5).join(', ')}.`
      : 'No hardcoded localhost URLs were detected in the scanned source.',
  };
}

function checkNodeVersionSupported(nodeProject, pkg) {
  if (!nodeProject) {
    return {
      id: 'node_version_supported',
      title: 'Unsupported Node version',
      status: 'pass',
      severity: 'info',
      message: 'Not applicable - this does not look like a Node.js project.',
    };
  }

  const engineRange = pkg.json && pkg.json.engines && pkg.json.engines.node;
  if (!engineRange) {
    return {
      id: 'node_version_supported',
      title: 'Unsupported Node version',
      status: 'warning',
      severity: 'low',
      message: 'No Node version is pinned via "engines.node" in package.json - the deployment platform will pick a default.',
    };
  }

  const majorMatch = engineRange.match(/(\d+)/);
  const major = majorMatch ? Number(majorMatch[1]) : null;

  if (major === null) {
    return {
      id: 'node_version_supported',
      title: 'Unsupported Node version',
      status: 'warning',
      severity: 'low',
      message: `Could not parse the Node version range "${engineRange}" in package.json.`,
    };
  }
  if (major < Math.min(...SUPPORTED_NODE_MAJORS)) {
    return {
      id: 'node_version_supported',
      title: 'Unsupported Node version',
      status: 'fail',
      severity: 'high',
      message: `package.json pins Node ${major}.x, which is end-of-life. Supported LTS versions are ${SUPPORTED_NODE_MAJORS.join('/')}.`,
    };
  }
  return {
    id: 'node_version_supported',
    title: 'Unsupported Node version',
    status: 'pass',
    severity: 'info',
    message: `package.json pins Node "${engineRange}", a supported version.`,
  };
}

function checkProductionConfig(nodeProject, pkg) {
  if (!nodeProject || !pkg.json) {
    return {
      id: 'production_config',
      title: 'Missing production configuration',
      status: 'pass',
      severity: 'info',
      message: 'Not applicable - no parsed package.json available to check.',
    };
  }

  const scripts = pkg.json.scripts || {};
  const hasDistinctProdScript = Boolean(scripts.start) && scripts.start !== scripts.dev;

  return {
    id: 'production_config',
    title: 'Missing production configuration',
    status: hasDistinctProdScript ? 'pass' : 'warning',
    severity: hasDistinctProdScript ? 'info' : 'low',
    message: hasDistinctProdScript
      ? 'A distinct production start script is defined separately from development.'
      : 'No clear separation between development and production start scripts was found - verify NODE_ENV and production settings are handled correctly.',
  };
}

function computeChecks({ detectedFiles, analysisResult, secretFindings, localhostFindings }) {
  const nodeProject = isNodeProject(detectedFiles, analysisResult);
  const pkg = parsePackageJson(detectedFiles);

  return [
    checkEnvExample(detectedFiles),
    checkPackageJsonValid(nodeProject, pkg),
    checkBuildAndStartScripts(nodeProject, pkg, analysisResult),
    checkDependenciesPresent(nodeProject, pkg),
    checkSecretsCommitted(secretFindings),
    checkDockerfilePresent(detectedFiles, analysisResult),
    checkHardcodedLocalhost(localhostFindings),
    checkNodeVersionSupported(nodeProject, pkg),
    checkProductionConfig(nodeProject, pkg),
  ];
}

function aggregate(checks) {
  const deducted = checks.reduce((sum, c) => {
    const weight = CHECK_WEIGHT[c.id] || 0;
    if (c.status === 'fail') return sum + weight;
    if (c.status === 'warning') return sum + weight / 2;
    return sum;
  }, 0);

  const score = Math.max(0, Math.round(100 - deducted));

  const hasCriticalFail = checks.some((c) => c.status === 'fail' && c.severity === 'critical');
  const hasAnyFail = checks.some((c) => c.status === 'fail');

  let overallStatus = 'Ready';
  if (hasCriticalFail) overallStatus = 'Not Ready';
  else if (hasAnyFail || checks.some((c) => c.status === 'warning')) overallStatus = 'Needs Attention';

  return { score, overallStatus };
}

async function generateNarrative(checks) {
  const runner = getRunner();
  const newMessage = {
    role: 'user',
    parts: [{ text: `Deployment readiness checks:\n${JSON.stringify(checks, null, 2)}` }],
  };

  let finalText = '';
  for await (const event of runner.runEphemeral({ userId: 'cloudpilot-system', newMessage })) {
    if (isFinalResponse(event)) {
      finalText = stringifyContent(event);
    }
  }
  if (!finalText) throw new Error('Deployment Readiness Agent did not return a response.');
  return extractJson(finalText);
}

async function runDeploymentReadinessCheck({ detectedFiles, analysisResult, secretFindings, localhostFindings }) {
  const checks = computeChecks({ detectedFiles, analysisResult, secretFindings, localhostFindings });
  const { score, overallStatus } = aggregate(checks);

  const report = { checks, score, overallStatus };

  try {
    const narrative = await generateNarrative(checks);
    if (narrative && typeof narrative.summary === 'string') {
      report.summary = narrative.summary;
    }
    if (narrative && Array.isArray(narrative.topRecommendations)) {
      report.topRecommendations = narrative.topRecommendations;
    }
  } catch (err) {
    // Non-fatal: the deterministic checklist stands on its own without a narrative.
    console.error('Deployment Readiness Agent narrative generation skipped:', err.message);
  }

  return report;
}

module.exports = { runDeploymentReadinessCheck };
