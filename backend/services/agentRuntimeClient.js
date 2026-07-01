const { spawn } = require('child_process');
const path = require('path');

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const SYNC_TIMEOUT_MS = Number(process.env.KNOWLEDGE_SYNC_TIMEOUT_MS || 30 * 60 * 1000);

function resolvePythonExecutable() {
  if (process.env.AGENT_RUNTIME_PYTHON) {
    return process.env.AGENT_RUNTIME_PYTHON;
  }
  if (process.platform === 'win32') {
    return 'C:\\cpvenv\\Scripts\\python.exe';
  }
  return 'python3';
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

function extractJsonPayload(stdout, errorHint) {
  const cleaned = stripAnsi(stdout).trim();
  if (!cleaned) {
    throw new Error(errorHint || 'Agent runtime returned empty output.');
  }

  const lines = cleaned.split('\n');
  const prefixedLine = lines.find((line) => line.trim().startsWith('__JSON_OUTPUT__:'));
  if (prefixedLine) {
    const jsonStr = prefixedLine.trim().substring('__JSON_OUTPUT__:'.length).trim();
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      // fallback
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error(errorHint || 'Agent runtime did not return valid JSON.');
    }
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function buildChildEnv() {
  const cwd = agentRuntimeCwd();
  const srcPath = path.join(cwd, 'src');
  const pythonPath = [srcPath, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter);
  return {
    ...process.env,
    NO_COLOR: '1',
    FORCE_COLOR: '0',
    TERM: 'dumb',
    PYTHONUNBUFFERED: '1',
    PYTHONPATH: pythonPath,
  };
}

function runPythonModule(moduleName, stdinPayload, timeoutMs, startErrorMessage) {
  return new Promise((resolve, reject) => {
    const python = resolvePythonExecutable();
    const cwd = agentRuntimeCwd();
    const child = spawn(python, ['-m', moduleName], {
      cwd,
      env: buildChildEnv(),
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Agent runtime request timed out.'));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`${startErrorMessage}: ${err.message}`));
    });

    if (stdinPayload) {
      child.stdin.write(JSON.stringify(stdinPayload));
      child.stdin.end();
    }

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        const detail = stripAnsi((stderr || stdout).trim());
        reject(new Error(detail || `Agent runtime exited with code ${code}`));
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
        resolve(
          extractJsonPayload(
            stdout,
            'Repository analysis did not return valid JSON. Check Ollama is running and OLLAMA_BASE_URL / OLLAMA_MODEL in backend .env.',
          ),
        );
      } catch (err) {
        reject(err);
      }
    });
  });
}

function runKnowledgeSync(manifest) {
  return runPythonModule(
    'cloudpilot.scripts.sync_knowledge_base',
    manifest,
    SYNC_TIMEOUT_MS,
    'Failed to start knowledge sync runtime',
  );
}

function runDocumentationQuery(payload) {
  return runPythonModule(
    'cloudpilot.scripts.run_documentation_query',
    payload,
    Number(process.env.KNOWLEDGE_QUERY_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    'Failed to start documentation query runtime',
  );
}

function runPlatformSelection(payload) {
  return runPythonModule(
    'cloudpilot.scripts.run_platform_selection',
    payload,
    Number(process.env.PLATFORM_SELECTION_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    'Failed to start platform selection runtime',
  );
}

function runArchitectureBlueprint(payload) {
  return runPythonModule(
    'cloudpilot.scripts.run_architecture',
    payload,
    Number(process.env.ARCHITECTURE_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    'Failed to start architecture agent runtime',
  );
}

module.exports = {
  runRepositoryAnalysis,
  runKnowledgeSync,
  runDocumentationQuery,
  runPlatformSelection,
  runArchitectureBlueprint,
  extractJsonPayload,
  stripAnsi,
};
