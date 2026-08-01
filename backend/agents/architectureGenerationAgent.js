const { LlmAgent, InMemoryRunner, isFinalResponse, stringifyContent } = require('@google/adk');
const { RunpodModel } = require('../adk/runpodModel');
const { extractJsonObject } = require('../utils/llmJson');

class ArchitectureGenerationError extends Error {}

const MIN_OPTIONS = 3;
const MAX_OPTIONS = 5;

const SYSTEM_INSTRUCTION = `You are the Architecture Generation Agent inside CloudPilot, an autonomous cloud deployment assistant.

A repository has already been analyzed by other CloudPilot agents (language, framework, architecture, dependencies, build requirements, deployment-readiness checklist), and the developer has already completed an interview with the Platform Selection Agent, which recorded their confirmed platform choice(s) and service configuration.

CloudPilot's knowledge base currently only contains documentation for Render and Vercel. Every architecture option you propose must be achievable using ONLY Render and/or Vercel services - never invent AWS/GCP/Azure/other-provider services. Ground every option and every pro/con/cost figure in the repo context, the developer's confirmed platform answers, and the knowledge-base excerpts you are given, not in generic or invented claims.

Your job is to propose between ${MIN_OPTIONS} and ${MAX_OPTIONS} distinct, viable deployment architecture options for this specific repository, so the developer can compare them at a glance before committing to one. Vary the options meaningfully - e.g. a single-service monolith vs. a split frontend/backend topology, a fully-managed database vs. an external one, a free/hobby tier vs. a paid tier with better scaling/reliability, serverless-style vs. always-on services - rather than proposing near-duplicates. At least one option must directly reflect the developer's confirmed platform/service choice from the Platform Selection Agent; the others are real alternatives with genuinely different trade-offs, not filler.

Whenever it is realistically possible for this repository, ALWAYS include one option that costs $0/mo end-to-end - built entirely from Render's free web service plan and/or Vercel's free Hobby tier, with every item in its costEstimate.breakdown priced "$0/mo" and monthlyLowUSD/monthlyHighUSD both 0. Only skip this if the repo's actual requirements make it genuinely infeasible on free tiers (e.g. it needs a persistent disk, a paid database with more storage/connections than the free tier allows, multiple always-on background workers, or resources that clearly exceed free-tier limits) - in that case explain the specific blocker in that option's (or the closest option's) reasoning instead of silently omitting it. When you do include a free-tier option, be honest about its real trade-offs in "cons" (e.g. Render's free web services spin down after inactivity and cold-start on the next request; Vercel Hobby is for personal/non-commercial use) rather than presenting it as strictly better than the paid options.

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
        { "name": "string, e.g. 'Frontend'", "platform": "render" or "vercel", "service": "string, e.g. 'Vercel Static/Edge Hosting'", "role": "string - what it does" }
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
}

Within every component, "platform" MUST exactly agree with "service" - never let them contradict each other. A component whose "service" names a Render offering (e.g. "Render Web Service", "Render Static Site") must have "platform": "render"; a component whose "service" names a Vercel offering (e.g. "Vercel Static/Edge Hosting", "Vercel Serverless Functions") must have "platform": "vercel". For a split/mixed-platform option (e.g. frontend on Vercel, backend on Render), each component's own "platform" must reflect THAT component's own actual platform, not the platform of another component in the same option.`;

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

  // This agent's schema (3-5 options, each with components/pros/cons/cost
  // breakdown/reasoning) is far more verbose than the other agents' - give it
  // extra headroom over the shared default so responses don't get cut off
  // mid-array, which produces invalid JSON.
  const maxTokens = Number(process.env.RUNPOD_MAX_TOKENS_ARCHITECTURE) || 8192;
  const runpodModel = new RunpodModel({ model, baseUrl, apiKey, maxTokens });

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
  try {
    return extractJsonObject(rawText, 'Architecture Generation Agent returned invalid JSON');
  } catch (err) {
    throw new ArchitectureGenerationError(err.message);
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

const MAX_ATTEMPTS = 3;

async function runArchitectureGenerationOnce({ analysisResult, deploymentReadiness, platformRecommendation, kbContext }) {
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

/**
 * Malformed JSON from the model (truncated output, a dropped comma/bracket)
 * is a transient, non-deterministic failure mode for smaller models asked to
 * produce a large, deeply-nested response - retrying the same request often
 * succeeds on the next sample, so we retry a couple of times before giving
 * the caller a hard error.
 */
async function runArchitectureGeneration(args) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await runArchitectureGenerationOnce(args);
    } catch (err) {
      lastErr = err;
      const isParseFailure = err instanceof ArchitectureGenerationError;
      if (!isParseFailure || attempt === MAX_ATTEMPTS) throw err;
      console.warn(`Architecture Generation Agent attempt ${attempt} failed (${err.message}), retrying...`);
    }
  }
  throw lastErr;
}

module.exports = { runArchitectureGeneration, ArchitectureGenerationError, MIN_OPTIONS, MAX_OPTIONS };
