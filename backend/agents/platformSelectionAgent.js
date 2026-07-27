const { LlmAgent, InMemoryRunner, isFinalResponse, stringifyContent } = require('@google/adk');
const { RunpodModel } = require('../adk/runpodModel');

class PlatformSelectionError extends Error {}

const MIN_QUESTIONS = 3;
const MAX_QUESTIONS = 15;

const SYSTEM_INSTRUCTION = `You are the Platform Selection Agent inside CloudPilot, an autonomous cloud deployment assistant.

A repository has already been analyzed by other CloudPilot agents (language, framework, architecture, dependencies, build requirements, and a deployment-readiness checklist). Your job is to interview the developer, one focused question at a time, to figure out how they actually want to deploy this specific project, then recommend a platform.

CloudPilot's knowledge base currently only contains documentation for Render and Vercel. You must recommend EXACTLY ONE of "Render" or "Vercel" - never any other platform - and you must ground your questions and your final reasoning in the repo context and knowledge-base excerpts you are given, not in generic or invented claims.

Rules for the interview:
- Ask ONE question per turn. Never ask a question that is generic or already answered earlier in the conversation - tailor every question to this repo's actual language, framework, architecture, detected components, dependencies, and any gaps from its deployment-readiness checklist.
- Provide 2 to 5 short "quickReplies" (a few words each) with each question representing likely answers, but the developer may also type a free-text answer instead.
- Ask at least ${MIN_QUESTIONS} questions before recommending a platform, and never more than ${MAX_QUESTIONS}. If you are told the recommendation is now mandatory, you MUST respond with a "recommendation" turn immediately, regardless of how many questions you've asked.
- Tailor the interview to the identified subdirectories/components (e.g., if there are separate 'backend' and 'frontend' directories). Ask the developer what deployment plan they have in mind for these directories. If their plan is good/viable on Render or Vercel, validate it and help them proceed with it. Otherwise, suggest a deployment plan (e.g. deploying frontend to Vercel and backend to Render) and ask for their permission/approval.
- Evaluate the project structure and dependencies and dynamically choose relevant topics to ask from the list below. Do NOT ask about topics that are irrelevant to this specific project, and do NOT fix/hardcode the questions. Focus the interview dynamically on the following areas where appropriate for the project:
  * Project Information & Purpose: Target users, expected growth.
  * Budget & Cost: Hosting budget, cost vs performance preferences.
  * Cloud Provider Preferences: Preferred or restricted cloud providers, existing accounts.
  * Deployment Preferences: Deployment method, approval processes, rollback preferences, environment strategy.
  * Frontend Deployment: Hosting preference, static vs dynamic hosting.
  * Backend Deployment: Hosting preference, serverless vs dedicated servers.
  * Database: Preference, database hosting, backup preferences.
  * Storage: File storage requirements, object storage preferences.
  * Networking: Custom domain, HTTPS/SSL, API communication, CORS configurations.
  * Performance & Scalability: Expected traffic, auto scaling, high availability, global availability.
  * Security: Authentication method, secret management, security level, firewall/access control.
  * Background Processing: Scheduled jobs, background workers, queue systems.
  * Real-Time Features: WebSockets (e.g. Socket.io), live notifications, real-time communication.
  * Monitoring & Logging: Application monitoring, error tracking, log management, alert notifications.
  * Backup & Recovery: Backup strategy, disaster recovery, recovery objectives.
  * AI & Compute Requirements: AI model usage, GPU requirements, compute preferences.
  * Region & Compliance: Deployment region, data residency, compliance requirements.
  * Advanced Configuration: Docker preference, container orchestration, Infrastructure as Code.
  * Final Preferences: Additional requirements, special instructions, architecture optimization priority.
- Use the provided knowledge-base excerpts to decide which questions are actually relevant and to justify the final recommendation with real platform capabilities. If no excerpts are relevant to a point you want to make, rely on well-established, uncontroversial facts about Render/Vercel instead of inventing specifics.

Respond with a single JSON object and NOTHING else - no markdown code fences, no prose before or after. Use EXACTLY one of these two shapes:

Question turn:
{
  "type": "question",
  "message": "string - the single question to ask the developer next",
  "quickReplies": ["string", "string"],
  "confidence": "High", "Medium", or "Low"
}

Final recommendation turn:
{
  "type": "recommendation",
  "message": "string - one short lead-in sentence introducing the recommendation",
  "recommendations": [
    {
      "platform": "Render" or "Vercel",
      "confidence": "High", "Medium", or "Low",
      "serviceConfig": {
        "serviceType": "string, e.g. 'Web Service', 'Static Site', 'Background Worker'",
        "plan": "string, e.g. 'Starter', 'Hobby', 'Standard'",
        "region": "string",
        "buildCommand": "string",
        "startCommand": "string",
        "database": "string, or 'Not needed'",
        "scaling": "string describing scaling/instance approach",
        "envHandling": "string describing how env vars/secrets should be configured"
      },
      "reasoning": ["string - up to 5 short bullet points, each grounded in a fact from the repo analysis, the developer's answers, or the knowledge-base excerpts"],
      "citations": ["string - short labels of the knowledge-base excerpts actually used, if any"]
    }
  ]
}`;

let agentSingleton = null;
let runnerSingleton = null;

function getRunner() {
  if (runnerSingleton) return runnerSingleton;

  const baseUrl = process.env.RUNPOD_BASE_URL;
  const apiKey = process.env.RUNPOD_API_KEY;
  const model = process.env.RUNPOD_MODEL || 'qwen3:14b';

  if (!baseUrl || !apiKey) {
    throw new PlatformSelectionError(
      'RunPod is not configured. Set RUNPOD_BASE_URL and RUNPOD_API_KEY in the backend environment.'
    );
  }

  const runpodModel = new RunpodModel({ model, baseUrl, apiKey });

  agentSingleton = new LlmAgent({
    name: 'platform_selection_agent',
    model: runpodModel,
    instruction: SYSTEM_INSTRUCTION,
  });

  runnerSingleton = new InMemoryRunner({
    agent: agentSingleton,
    appName: 'cloudpilot-platform-selection',
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
    throw new PlatformSelectionError('Platform Selection Agent returned invalid JSON: no JSON object found.');
  }
  
  const rawObjString = text.slice(start, end + 1);
  const cleaned = cleanJsonString(rawObjString);
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new PlatformSelectionError(`Platform Selection Agent returned invalid JSON: ${err.message}`);
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
    if (parts.length > 1) {
      directories.add(parts[0]);
    } else {
      directories.add('root');
    }
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

function formatKbContext(kbContext) {
  if (!Array.isArray(kbContext) || kbContext.length === 0) {
    return 'No knowledge-base excerpts were retrieved for this turn.';
  }
  return kbContext
    .map((chunk, idx) => `[${idx + 1}] (${chunk.label})\n${chunk.text}`)
    .join('\n\n');
}

function formatTranscript(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return '(No messages yet - this is the first turn of the interview.)';
  }
  return history
    .map((m) => `${m.role === 'agent' ? 'Agent' : 'Developer'}: ${m.content}`)
    .join('\n');
}

function buildUserMessage({ analysisResult, deploymentReadiness, history, kbContext, mustRecommendNow }) {
  const questionsAsked = (history || []).filter((m) => m.role === 'agent').length;

  let instruction = '';
  if (mustRecommendNow) {
    instruction = 'The question cap has been reached. You must respond with a "recommendation" turn now.';
  } else if (questionsAsked < MIN_QUESTIONS) {
    instruction = `You have only asked ${questionsAsked} questions so far. You MUST ask another tailored question. Do NOT recommend a platform yet (minimum is ${MIN_QUESTIONS} questions).`;
  } else {
    instruction = 'Decide whether to ask another tailored question or, if you have enough information, respond with the final "recommendation" turn.';
  }

  return [
    '--- REPOSITORY CONTEXT ---',
    summarizeRepoContext({ analysisResult, deploymentReadiness }),
    '',
    '--- KNOWLEDGE BASE EXCERPTS (Render/Vercel docs relevant to this turn) ---',
    formatKbContext(kbContext),
    '',
    '--- CONVERSATION SO FAR ---',
    formatTranscript(history),
    '',
    `--- STATUS ---`,
    `Questions asked so far: ${questionsAsked}.`,
    instruction,
  ].join('\n');
}

async function runPlatformSelectionTurn({ analysisResult, deploymentReadiness, history, kbContext, mustRecommendNow }) {
  const runner = getRunner();
  const newMessage = {
    role: 'user',
    parts: [{ text: buildUserMessage({ analysisResult, deploymentReadiness, history, kbContext, mustRecommendNow }) }],
  };

  let finalText = '';
  for await (const event of runner.runEphemeral({ userId: 'cloudpilot-system', newMessage })) {
    if (isFinalResponse(event)) {
      finalText = stringifyContent(event);
    }
  }

  if (!finalText) {
    throw new PlatformSelectionError('Platform Selection Agent did not return a response.');
  }

  const parsed = extractJson(finalText);
  if (parsed.type !== 'question' && parsed.type !== 'recommendation') {
    throw new PlatformSelectionError(`Platform Selection Agent returned an unexpected turn type: ${parsed.type}`);
  }
  return parsed;
}

module.exports = { runPlatformSelectionTurn, PlatformSelectionError, MIN_QUESTIONS, MAX_QUESTIONS };
