const { LlmAgent, InMemoryRunner, isFinalResponse, stringifyContent } = require('@google/adk');
const { RunpodModel } = require('../adk/runpodModel');

class ArchitectureGenerationError extends Error {}

const MIN_OPTIONS = 3;
const MAX_OPTIONS = 5;

const SYSTEM_INSTRUCTION = `You are the Architecture Generation Agent inside CloudPilot, an autonomous cloud deployment assistant.

A repository has already been analyzed by other CloudPilot agents (language, framework, architecture, dependencies, build requirements, deployment-readiness checklist), and the developer has already completed an interview with the Platform Selection Agent, which recorded their confirmed platform choice(s) and service configuration.

CloudPilot's knowledge base currently only contains documentation for Render and Vercel. Every architecture option you propose must be achievable using ONLY Render and/or Vercel services - never invent AWS/GCP/Azure/other-provider services. Ground every option and every pro/con/cost figure in the repo context, the developer's confirmed platform answers, and the knowledge-base excerpts you are given, not in generic or invented claims.

Your job is to propose between ${MIN_OPTIONS} and ${MAX_OPTIONS} distinct, viable deployment architecture options for this specific repository, so the developer can compare them at a glance before committing to one. Vary the options meaningfully - e.g. a single-service monolith vs. a split frontend/backend topology, a fully-managed database vs. an external one, a free/hobby tier vs. a paid tier with better scaling/reliability, serverless-style vs. always-on services - rather than proposing near-duplicates. At least one option must directly reflect the developer's confirmed platform/service choice from the Platform Selection Agent; the others are real alternatives with genuinely different trade-offs, not filler.

For every option provide a fair, balanced comparison so the developer gets a real high-level view:
- Concrete pros and cons (not generic marketing language).
- A monthly cost estimate range in USD grounded in known Render/Vercel pricing tiers (free/hobby/starter/standard, etc.), with a short per-item breakdown. If exact pricing cannot be grounded in the knowledge base, use well-established public pricing tiers for Render/Vercel and say so rather than inventing precise numbers.
- Ratings (Low/Medium/High) for complexity (setup & operational effort), scalability, and reliability, so options can be compared side by side.
- A short "bestFor" description of the situation this option suits best.

Respond with a single JSON object and NOTHING else - no markdown code fences, no prose before or after. Use EXACTLY this shape:

{
  "message": "string - one short lead-in sentence introducing the set of options",
  "options": [
    {
      "id": "string - short stable slug, e.g. 'render-monolith'",
      "name": "string - short descriptive name, e.g. 'Single Render Web Service (Monolith)'",
      "pattern": "string - short architecture pattern label, e.g. 'Monolith on PaaS' or 'Split Frontend/Backend'",
      "summary": "string - 1-2 sentences describing the topology",
      "components": [
        { "name": "string, e.g. 'Frontend'", "service": "string, e.g. 'Vercel Static/Edge Hosting'", "role": "string - what it does" }
      ],
      "pros": ["string - up to 5 concrete advantages"],
      "cons": ["string - up to 5 concrete trade-offs"],
      "costEstimate": {
        "monthlyLowUSD": 0,
        "monthlyHighUSD": 0,
        "breakdown": [
          { "item": "string, e.g. 'Render Starter web service'", "costUSD": "string, e.g. '$7/mo'" }
        ],
        "notes": "string - assumptions behind the estimate"
      },
      "complexity": "Low", "Medium", or "High",
      "scalability": "Low", "Medium", or "High",
      "reliability": "Low", "Medium", or "High",
      "bestFor": "string - short description of the ideal use case for this option",
      "recommended": true or false,
      "reasoning": ["string - up to 5 short bullet points grounded in the repo analysis, the developer's platform answers, or knowledge-base excerpts"],
      "citations": ["string - short labels of the knowledge-base excerpts actually used, if any"]
    }
  ],
  "recommendedOptionId": "string - must match the id of exactly one option in the list, the one with recommended: true"
}`;

let agentSingleton = null;
let runnerSingleton = null;

function getRunner() {
  if (runnerSingleton) return runnerSingleton;

  const baseUrl = process.env.RUNPOD_BASE_URL;
  const apiKey = process.env.RUNPOD_API_KEY;
  const model = process.env.RUNPOD_MODEL || 'qwen3:14b';

  if (!baseUrl || !apiKey) {
    throw new ArchitectureGenerationError(
      'RunPod is not configured. Set RUNPOD_BASE_URL and RUNPOD_API_KEY in the backend environment.'
    );
  }

  const runpodModel = new RunpodModel({ model, baseUrl, apiKey });

  agentSingleton = new LlmAgent({
    name: 'architecture_generation_agent',
    model: runpodModel,
    instruction: SYSTEM_INSTRUCTION,
  });

  runnerSingleton = new InMemoryRunner({
    agent: agentSingleton,
    appName: 'cloudpilot-architecture-generation',
  });

  return runnerSingleton;
}

function extractJson(rawText) {
  let text = rawText.trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) text = fenceMatch[1].trim();

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new ArchitectureGenerationError('Architecture Generation Agent returned invalid JSON: no JSON object found.');
  }
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (err) {
    throw new ArchitectureGenerationError(`Architecture Generation Agent returned invalid JSON: ${err.message}`);
  }
}

function summarizeRepoContext({ analysisResult, deploymentReadiness }) {
  const r = analysisResult || {};
  const architecture = r.architecture || {};
  const buildRequirements = r.buildRequirements || {};
  const dependencyNames = (r.dependencies || []).slice(0, 15).map((d) => d.name).filter(Boolean);
  const coreFeatureTitles = (r.coreFeatures || []).map((f) => f.title).filter(Boolean);

  const detectedFiles = r.detectedFiles || [];
  const directories = new Set();
  detectedFiles.forEach((filePath) => {
    const parts = filePath.split('/');
    directories.add(parts.length > 1 ? parts[0] : 'root');
  });
  const identifiedDirs = Array.from(directories).join(', ');

  const lines = [
    `Language: ${r.language || 'Not detected'}`,
    `Framework: ${r.framework || 'Not detected'}`,
    `Payment gateway: ${r.paymentGateway || 'None detected'}`,
    `Architecture type: ${architecture.type || 'Not detected'}`,
    `Architecture pattern: ${architecture.pattern || 'Not detected'}`,
    `Architecture summary: ${architecture.summary || 'Not detected'}`,
    `Components: ${(architecture.components || []).map((c) => `${c.name} (${c.role})`).join(', ') || 'None detected'}`,
    `Dependencies (sample): ${dependencyNames.join(', ') || 'None detected'}`,
    `Runtime version: ${buildRequirements.runtimeVersion || 'Not detected'}`,
    `Build command: ${buildRequirements.buildCommand || 'Not detected'}`,
    `Start command: ${buildRequirements.startCommand || 'Not detected'}`,
    `Env variables referenced: ${(buildRequirements.envVariables || []).join(', ') || 'None detected'}`,
    `Core features: ${coreFeatureTitles.join(', ') || 'None detected'}`,
    `Identified Directories: ${identifiedDirs || 'root'}`,
  ];

  if (deploymentReadiness) {
    lines.push(
      `Deployment readiness: score ${deploymentReadiness.score ?? 'N/A'}/100, status "${deploymentReadiness.overallStatus || 'Unknown'}"`
    );
    const failingChecks = (deploymentReadiness.checks || [])
      .filter((c) => c.status !== 'pass')
      .map((c) => `${c.title} (${c.status})`);
    if (failingChecks.length) {
      lines.push(`Outstanding readiness issues: ${failingChecks.join(', ')}`);
    }
  }

  return lines.join('\n');
}

function summarizePlatformRecommendation(platformRecommendation) {
  if (!platformRecommendation) {
    return 'No confirmed platform recommendation is available.';
  }
  const list = Array.isArray(platformRecommendation.recommendations)
    ? platformRecommendation.recommendations
    : [platformRecommendation];

  return list
    .map((rec, idx) => {
      const config = rec.serviceConfig || {};
      const configLines = [
        `Service Type: ${config.serviceType || 'Not specified'}`,
        `Plan: ${config.plan || 'Not specified'}`,
        `Region: ${config.region || 'Not specified'}`,
        `Database: ${config.database || 'Not specified'}`,
        `Scaling: ${config.scaling || 'Not specified'}`,
      ].join(', ');
      return `[${idx + 1}] Confirmed platform: ${rec.platform || 'Unknown'} (${rec.confidence || 'Unknown'} confidence) - ${configLines}`;
    })
    .join('\n');
}

function formatKbContext(kbContext) {
  if (!Array.isArray(kbContext) || kbContext.length === 0) {
    return 'No knowledge-base excerpts were retrieved.';
  }
  return kbContext
    .map((chunk, idx) => `[${idx + 1}] (${chunk.label})\n${chunk.text}`)
    .join('\n\n');
}

function buildUserMessage({ analysisResult, deploymentReadiness, platformRecommendation, kbContext }) {
  return [
    '--- REPOSITORY CONTEXT ---',
    summarizeRepoContext({ analysisResult, deploymentReadiness }),
    '',
    '--- CONFIRMED PLATFORM SELECTION (from Platform Selection Agent interview) ---',
    summarizePlatformRecommendation(platformRecommendation),
    '',
    '--- KNOWLEDGE BASE EXCERPTS (Render/Vercel docs) ---',
    formatKbContext(kbContext),
    '',
    '--- INSTRUCTION ---',
    `Generate between ${MIN_OPTIONS} and ${MAX_OPTIONS} distinct deployment architecture options for this repository, following the required JSON shape exactly.`,
  ].join('\n');
}

async function runArchitectureGeneration({ analysisResult, deploymentReadiness, platformRecommendation, kbContext }) {
  const runner = getRunner();
  const newMessage = {
    role: 'user',
    parts: [{ text: buildUserMessage({ analysisResult, deploymentReadiness, platformRecommendation, kbContext }) }],
  };

  let finalText = '';
  for await (const event of runner.runEphemeral({ userId: 'cloudpilot-system', newMessage })) {
    if (isFinalResponse(event)) {
      finalText = stringifyContent(event);
    }
  }

  if (!finalText) {
    throw new ArchitectureGenerationError('Architecture Generation Agent did not return a response.');
  }

  const parsed = extractJson(finalText);
  if (!Array.isArray(parsed.options) || parsed.options.length === 0) {
    throw new ArchitectureGenerationError('Architecture Generation Agent returned no architecture options.');
  }

  return parsed;
}

module.exports = { runArchitectureGeneration, ArchitectureGenerationError, MIN_OPTIONS, MAX_OPTIONS };
