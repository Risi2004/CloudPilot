const { LlmAgent, InMemoryRunner, isFinalResponse, stringifyContent } = require('@google/adk');
const { RunpodModel } = require('../adk/runpodModel');
const { extractJsonObject } = require('../utils/llmJson');

class AnalysisError extends Error {}

const SYSTEM_INSTRUCTION = `You are the Code Analysis Agent inside CloudPilot, an autonomous cloud deployment assistant.

You will be given the contents of one or more project metadata files pulled from the root of a GitHub repository (e.g. package.json, requirements.txt, pom.xml, go.mod, Dockerfile, README.md, etc). Your job is to detect the project's language, framework, dependencies, and overall architecture, and respond with a single JSON object and NOTHING else - no markdown code fences, no prose before or after.

Respond with EXACTLY this JSON shape (omit no keys; use empty arrays/"Not detected" where information is genuinely unavailable):

{
  "language": "string - primary programming language and version if known",
  "framework": "string - primary framework, e.g. 'Next.js 14 (App Router)' or 'Django 5.0'",
  "paymentGateway": "string - detected payment integration (e.g. 'Stripe') or 'None detected'",
  "architecture": {
    "type": "string - e.g. 'Full-Stack Web Application', 'Backend API Service', 'Static Frontend'",
    "pattern": "string - e.g. 'Monolithic (Next.js App Router)', 'Microservices', 'SPA + REST API backend'",
    "summary": "string - 2 to 4 sentences describing the architecture in detail",
    "components": [ { "name": "string", "role": "string", "description": "string" } ],
    "entryPoints": ["string - key entry files, e.g. 'src/index.js'"]
  },
  "dependencies": [ { "name": "string", "version": "string", "type": "production" } ],
  "buildRequirements": {
    "runtimeVersion": "string",
    "buildCommand": "string",
    "startCommand": "string",
    "envVariables": ["KEY (short description)"]
  },
  "coreFeatures": [ { "title": "string", "status": "Active", "desc": "string" } ],
  "detectedFiles": ["string - list of the file paths you were given"]
}

Base every field strictly on the file contents provided - do not invent dependencies, versions, or features that are not evidenced in the files. If a field cannot be determined, use an empty array or a clear "Not detected" string rather than guessing.`;

let agentSingleton = null;
let runnerSingleton = null;

function getRunner() {
  if (runnerSingleton) return runnerSingleton;

  const baseUrl = process.env.RUNPOD_BASE_URL;
  const apiKey = process.env.RUNPOD_API_KEY;
  const model = process.env.RUNPOD_MODEL || 'qwen3:14b';

  if (!baseUrl || !apiKey) {
    throw new AnalysisError(
      'RunPod is not configured. Set RUNPOD_BASE_URL and RUNPOD_API_KEY in the backend environment.'
    );
  }

  const runpodModel = new RunpodModel({ model, baseUrl, apiKey });

  agentSingleton = new LlmAgent({
    name: 'code_analysis_agent',
    model: runpodModel,
    instruction: SYSTEM_INSTRUCTION,
  });

  runnerSingleton = new InMemoryRunner({
    agent: agentSingleton,
    appName: 'cloudpilot-code-analysis',
  });

  return runnerSingleton;
}

function buildUserMessage({ repoUrl, files }) {
  const filesBlock = files
    .map((f) => `--- FILE: ${f.path} ---\n${f.content}`)
    .join('\n\n');

  return `Repository: ${repoUrl}\n\nAnalyze the following project metadata files and respond with the JSON object described in your instructions.\n\n${filesBlock}`;
}

function extractJson(rawText) {
  try {
    return extractJsonObject(rawText, 'Code Analysis Agent returned invalid JSON');
  } catch (err) {
    throw new AnalysisError(err.message);
  }
}

async function runCodeAnalysisAgent({ repoUrl, files, userId }) {
  if (!files || files.length === 0) {
    throw new AnalysisError('No project metadata files were provided to the Code Analysis Agent.');
  }

  const runner = getRunner();
  const newMessage = { role: 'user', parts: [{ text: buildUserMessage({ repoUrl, files }) }] };

  let finalText = '';
  for await (const event of runner.runEphemeral({
    userId: userId || 'cloudpilot-system',
    newMessage,
  })) {
    if (isFinalResponse(event)) {
      finalText = stringifyContent(event);
    }
  }

  if (!finalText) {
    throw new AnalysisError('Code Analysis Agent did not return a response.');
  }

  return extractJson(finalText);
}

module.exports = { runCodeAnalysisAgent, AnalysisError };
