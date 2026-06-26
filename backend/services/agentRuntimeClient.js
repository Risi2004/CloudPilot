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

/**
 * Run RepositoryAnalysisService via the agent-runtime CLI and return parsed JSON.
 */
function runRepositoryAnalysis(source) {
  return new Promise((resolve, reject) => {
    const { command, args } = resolveAnalyzeCommand(source);
    const cwd = agentRuntimeCwd();

    const child = spawn(command, args, {
      cwd,
      env: { ...process.env },
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
        const detail = (stderr || stdout).trim();
        reject(new Error(detail || `Repository analysis exited with code ${code}`));
        return;
      }

      const trimmed = stdout.trim();
      if (!trimmed) {
        reject(new Error('Repository analysis returned empty output.'));
        return;
      }

      try {
        resolve(JSON.parse(trimmed));
      } catch (err) {
        reject(new Error(`Failed to parse repository analysis JSON: ${err.message}`));
      }
    });
  });
}

module.exports = { runRepositoryAnalysis };
