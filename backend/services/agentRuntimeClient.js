const { spawn } = require('child_process');
const path = require('path');

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

function resolvePythonExecutable() {
  if (process.env.AGENT_RUNTIME_PYTHON) {
    return process.env.AGENT_RUNTIME_PYTHON;
  }
  if (process.platform === 'win32') {
    return 'C:\\cpvenv\\Scripts\\python.exe';
  }
  return 'python3';
}

function resolveAnalyzeCommand(source) {
  const customCli = process.env.AGENT_RUNTIME_CLI;
  if (customCli) {
    return { command: customCli, args: [source] };
  }

  const python = resolvePythonExecutable();
  return {
    command: python,
    args: ['-m', 'cloudpilot.scripts.run_repository_analysis', source],
  };
}

function agentRuntimeCwd() {
  if (process.env.AGENT_RUNTIME_DIR) {
    return process.env.AGENT_RUNTIME_DIR;
  }
  return path.resolve(__dirname, '../../agent-runtime');
}

function stripAnsi(text) {
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}

/**
 * Extract the JSON object from subprocess stdout.
 * LiteLLM may emit colored help text before the payload on some platforms.
 */
function extractJsonPayload(stdout) {
  const cleaned = stripAnsi(stdout).trim();
  if (!cleaned) {
    throw new Error('Repository analysis returned empty output.');
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error(
        'Repository analysis did not return valid JSON. Check Ollama is running and OLLAMA_BASE_URL / OLLAMA_MODEL in backend .env.',
      );
    }
    const candidate = cleaned.slice(start, end + 1);
    return JSON.parse(candidate);
  }
}

function buildChildEnv() {
  return {
    ...process.env,
    NO_COLOR: '1',
    FORCE_COLOR: '0',
    TERM: 'dumb',
    PYTHONUNBUFFERED: '1',
  };
}

/**
 * Run RepositoryAnalysisService via the agent-runtime CLI and return parsed JSON.
 */
function runRepositoryAnalysis(source) {
  return new Promise((resolve, reject) => {
    const { command, args } = resolveAnalyzeCommand(source);
    const cwd = agentRuntimeCwd();

    const child = spawn(command, args, {
      cwd,
      env: buildChildEnv(),
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Repository analysis timed out. Try again or use a smaller repository.'));
    }, Number(process.env.AGENT_RUNTIME_TIMEOUT_MS || DEFAULT_TIMEOUT_MS));

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to start agent runtime (${command}): ${err.message}`));
    });

    child.on('close', (code) => {
      clearTimeout(timeout);

      if (code !== 0) {
        const detail = stripAnsi((stderr || stdout).trim());
        if (/ollama|connection|litellm/i.test(detail)) {
          reject(
            new Error(
              'AI model unavailable. Ensure Ollama is running (`ollama serve`) and OLLAMA_BASE_URL / OLLAMA_MODEL match your local model in backend .env.',
            ),
          );
          return;
        }
        reject(new Error(detail || `Repository analysis exited with code ${code}`));
        return;
      }

      try {
        resolve(extractJsonPayload(stdout));
      } catch (err) {
        reject(err);
      }
    });
  });
}

module.exports = { runRepositoryAnalysis, extractJsonPayload, stripAnsi };
