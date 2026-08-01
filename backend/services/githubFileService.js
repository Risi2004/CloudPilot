const GITHUB_API = 'https://api.github.com';

// Root-level project metadata files the Code Analysis Agent knows how to read.
// Matching is case-insensitive against the repo's root directory listing.
const CANDIDATE_FILES = [
  'package.json',
  'requirements.txt',
  'pyproject.toml',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'go.mod',
  'Cargo.toml',
  'composer.json',
  'Gemfile',
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'vercel.json',
  'render.yaml',
  'README.md',
  '.env.example',
  'next.config.js',
  'next.config.mjs',
  'next.config.ts',
  'vite.config.js',
  'vite.config.ts',
  'angular.json',
];

const MAX_CHARS_PER_FILE = 4000;
const MAX_TOTAL_CHARS = 20000;

// Source file extensions worth scanning for environment-variable references.
const SCANNABLE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.java', '.php', '.rs',
]);

// Directories that never contain first-party source code worth scanning.
const IGNORED_DIR_SEGMENTS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage',
  'vendor', 'venv', '.venv', '__pycache__', 'target', '.idea', '.vscode', '.cache',
]);

const MAX_SCAN_FILES = 60;
const MAX_SCAN_FILE_SIZE = 200 * 1024; // skip files bigger than this (likely bundled/minified)

// Patterns covering common ways code reads environment variables across languages.
const ENV_VAR_PATTERNS = [
  /process\.env\.([A-Z_][A-Z0-9_]*)/g,
  /process\.env\[\s*['"]([A-Z_][A-Z0-9_]*)['"]\s*\]/g,
  /import\.meta\.env\.([A-Z_][A-Z0-9_]*)/g,
  /os\.environ\.get\(\s*['"]([A-Z_][A-Z0-9_]*)['"]/g,
  /os\.environ\[\s*['"]([A-Z_][A-Z0-9_]*)['"]\s*\]/g,
  /os\.getenv\(\s*['"]([A-Z_][A-Z0-9_]*)['"]/g,
  /ENV\[\s*['"]([A-Z_][A-Z0-9_]*)['"]\s*\]/g,
  /System\.getenv\(\s*['"]([A-Z_][A-Z0-9_]*)['"]\s*\)/g,
];

// Patterns covering common ways real secrets get hardcoded into source instead of read from env.
// These are separate from ENV_VAR_PATTERNS above, which only match *references* like process.env.X.
const SECRET_PATTERNS = [
  { label: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/g },
  { label: 'Private key block', regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g },
  { label: 'Stripe live secret key', regex: /sk_live_[0-9a-zA-Z]{16,}/g },
  { label: 'GitHub token', regex: /gh[pousr]_[0-9a-zA-Z]{20,}/g },
  { label: 'Slack token', regex: /xox[baprs]-[0-9a-zA-Z-]{10,}/g },
  {
    label: 'Hardcoded credential literal',
    regex: /\b(?:SECRET|PASSWORD|PRIVATE_KEY|API_KEY|ACCESS_KEY)\w*\s*[:=]\s*['"][^'"\s]{8,}['"]/gi,
  },
];

// Hardcoded localhost/loopback URLs left over from local development.
const LOCALHOST_PATTERNS = [
  /https?:\/\/localhost(?::\d+)?/g,
  /https?:\/\/127\.0\.0\.1(?::\d+)?/g,
];

class GithubFileError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

function parseRepoUrl(repoUrl) {
  const match = repoUrl
    .trim()
    .replace(/\.git$/, '')
    .replace(/\/+$/, '')
    .match(/github\.com[/:]([^/]+)\/([^/]+)/i);

  if (!match) {
    throw new GithubFileError(`Could not parse a GitHub owner/repo from "${repoUrl}".`, 400);
  }
  return { owner: match[1], repo: match[2] };
}

async function githubFetch(path, githubToken, { method = 'GET', body } = {}) {
  const response = await fetch(`${GITHUB_API}${path}`, {
    method,
    headers: {
      Authorization: `token ${githubToken}`,
      Accept: 'application/vnd.github.v3+json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    throw new GithubFileError('GitHub token is invalid or expired.', 401);
  }
  if (response.status === 404) {
    throw new GithubFileError('Repository not found or not accessible with this GitHub account.', 404);
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new GithubFileError(`GitHub API request failed (${response.status}): ${text.slice(0, 300)}`, 502);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function fetchProjectMetadataFiles(repoUrl, githubToken) {
  if (!githubToken) {
    throw new GithubFileError('A GitHub token is required to analyze this repository.', 401);
  }

  const { owner, repo } = parseRepoUrl(repoUrl);
  
  // Get repository info to find the default branch name
  const repoInfo = await githubFetch(`/repos/${owner}/${repo}`, githubToken);
  const branch = repoInfo.default_branch || 'main';

  // Fetch the entire tree recursively to support nested metadata files (e.g. backend/package.json)
  const treeData = await githubFetch(
    `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    githubToken
  );

  const tree = Array.isArray(treeData.tree) ? treeData.tree : [];
  const candidateLookup = new Set(CANDIDATE_FILES.map((f) => f.toLowerCase()));

  // Filter tree entries for blobs whose file name (basename) matches one of our candidates
  const matches = tree.filter((entry) => {
    if (entry.type !== 'blob' || typeof entry.path !== 'string') return false;
    
    // Extract filename from path
    const parts = entry.path.split('/');
    const filename = parts[parts.length - 1];
    return candidateLookup.has(filename.toLowerCase());
  });

  const detectedFiles = [];
  let totalChars = 0;

  for (const entry of matches) {
    if (totalChars >= MAX_TOTAL_CHARS) break;

    const fileData = await githubFetch(`/repos/${owner}/${repo}/contents/${encodeURIComponent(entry.path)}`, githubToken);
    if (fileData.encoding !== 'base64' || typeof fileData.content !== 'string') continue;

    let content = Buffer.from(fileData.content, 'base64').toString('utf-8');
    const remainingBudget = MAX_TOTAL_CHARS - totalChars;
    const cap = Math.min(MAX_CHARS_PER_FILE, remainingBudget);
    if (content.length > cap) {
      content = `${content.slice(0, cap)}\n...[truncated]`;
    }

    detectedFiles.push({ path: entry.path, content });
    totalChars += content.length;
  }

  return { detectedFiles, repoFullName: `${owner}/${repo}` };
}

function isIgnoredPath(path) {
  return path.split('/').some((segment) => IGNORED_DIR_SEGMENTS.has(segment));
}

function getExtension(path) {
  const dot = path.lastIndexOf('.');
  return dot === -1 ? '' : path.slice(dot).toLowerCase();
}

/**
 * Recursively walks the repo's default branch tree once and regex-scans source files for:
 *  - environment-variable reads (process.env.X, import.meta.env.X, os.getenv, etc)
 *  - hardcoded secrets (API keys, private key blocks, credential literals)
 *  - hardcoded localhost/loopback URLs
 *  - a literal committed .env file (a secrets-exposure signal on its own)
 * Best-effort: caps the number/size of files fetched to keep this fast on large repos.
 * A single tree walk is reused for all four so this remains one recursive-tree fetch
 * plus up to MAX_SCAN_FILES blob fetches, regardless of how many callers need the data.
 */
async function scanRepoSource(repoUrl, githubToken) {
  const { owner, repo } = parseRepoUrl(repoUrl);

  const repoInfo = await githubFetch(`/repos/${owner}/${repo}`, githubToken);
  const branch = repoInfo.default_branch || 'main';

  const treeData = await githubFetch(
    `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    githubToken
  );

  const tree = Array.isArray(treeData.tree) ? treeData.tree : [];

  const committedEnvFile = tree.find(
    (entry) => entry.type === 'blob' && typeof entry.path === 'string' && /(^|\/)\.env$/i.test(entry.path)
  );

  const candidates = tree
    .filter(
      (entry) =>
        entry.type === 'blob' &&
        typeof entry.path === 'string' &&
        SCANNABLE_EXTENSIONS.has(getExtension(entry.path)) &&
        !isIgnoredPath(entry.path) &&
        (typeof entry.size !== 'number' || entry.size <= MAX_SCAN_FILE_SIZE)
    )
    .slice(0, MAX_SCAN_FILES);

  const keyToFiles = new Map();
  const secretToFiles = new Map();
  const localhostFiles = new Set();

  for (const entry of candidates) {
    let blob;
    try {
      blob = await githubFetch(`/repos/${owner}/${repo}/git/blobs/${entry.sha}`, githubToken);
    } catch (err) {
      continue; // best-effort: skip files that fail to fetch
    }
    if (blob.encoding !== 'base64' || typeof blob.content !== 'string') continue;

    let content;
    try {
      content = Buffer.from(blob.content, 'base64').toString('utf-8');
    } catch (err) {
      continue;
    }

    for (const pattern of ENV_VAR_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const key = match[1];
        if (!keyToFiles.has(key)) keyToFiles.set(key, new Set());
        keyToFiles.get(key).add(entry.path);
      }
    }

    for (const { label, regex } of SECRET_PATTERNS) {
      regex.lastIndex = 0;
      if (regex.test(content)) {
        if (!secretToFiles.has(label)) secretToFiles.set(label, new Set());
        secretToFiles.get(label).add(entry.path);
      }
    }

    for (const pattern of LOCALHOST_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(content)) {
        localhostFiles.add(entry.path);
      }
    }
  }

  const envVars = Array.from(keyToFiles.entries())
    .map(([key, files]) => ({ key, files: Array.from(files) }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const secretFindings = Array.from(secretToFiles.entries()).map(([label, files]) => ({
    label,
    files: Array.from(files),
  }));

  if (committedEnvFile) {
    secretFindings.push({ label: 'Committed .env file', files: [committedEnvFile.path] });
  }

  const localhostFindings = Array.from(localhostFiles);

  return { envVars, secretFindings, localhostFindings };
}

// Path segments that strongly suggest a file contains auth-related routes,
// regardless of framework (Express/Flask/Django/Next.js/etc all tend to name
// things this way).
const AUTH_PATH_KEYWORDS = /(^|\/)(auth|login|register|signup|signin|session|user|account)s?[^/]*\.(js|jsx|ts|tsx|mjs|cjs|py|rb|go|java|php)$/i;

// Common app entrypoint filenames - small apps often inline auth routes
// directly here instead of a dedicated auth file.
const ENTRYPOINT_FILENAMES = new Set([
  'server.js', 'app.js', 'index.js', 'main.js',
  'app.py', 'main.py', 'manage.py', 'urls.py',
]);

// Deliberately smaller than the shared metadata-file caps above - this
// content all gets read by a reasoning model in one shot to infer a test
// plan, and a big pile of source code can make it spend so much of its
// token budget "thinking" that it never gets around to writing an answer.
// Fewer, shorter excerpts keep that reasoning burden bounded.
const MAX_AUTH_CANDIDATE_FILES = 6;
const MAX_AUTH_CHARS_PER_FILE = 2000;
const MAX_AUTH_TOTAL_CHARS = 8000;

/**
 * Best-effort discovery of files likely to define this repo's registration/
 * login/protected-route endpoints, for the Deployment Verification Agent's
 * LLM step to read and infer the actual test plan from - mirrors
 * scanRepoSource's tree-walk, but returns raw file content (like
 * fetchProjectMetadataFiles) rather than trying to regex-parse exact routes
 * itself, since reading code to find the real endpoints is exactly what the
 * LLM step is for (same division of labor as the Code Analysis Agent).
 */
async function discoverAuthRoutes(repoUrl, githubToken) {
  const { owner, repo } = parseRepoUrl(repoUrl);

  const repoInfo = await githubFetch(`/repos/${owner}/${repo}`, githubToken);
  const branch = repoInfo.default_branch || 'main';

  const treeData = await githubFetch(
    `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    githubToken
  );
  const tree = Array.isArray(treeData.tree) ? treeData.tree : [];

  const scannable = tree.filter(
    (entry) =>
      entry.type === 'blob' &&
      typeof entry.path === 'string' &&
      SCANNABLE_EXTENSIONS.has(getExtension(entry.path)) &&
      !isIgnoredPath(entry.path) &&
      (typeof entry.size !== 'number' || entry.size <= MAX_SCAN_FILE_SIZE)
  );

  const byAuthPath = scannable.filter((entry) => AUTH_PATH_KEYWORDS.test(entry.path));
  const byEntrypoint = scannable.filter((entry) => ENTRYPOINT_FILENAMES.has(entry.path.split('/').pop().toLowerCase()));

  const seen = new Set();
  const candidates = [...byAuthPath, ...byEntrypoint]
    .filter((entry) => {
      if (seen.has(entry.path)) return false;
      seen.add(entry.path);
      return true;
    })
    .slice(0, MAX_AUTH_CANDIDATE_FILES);

  const candidateFiles = [];
  let totalChars = 0;

  for (const entry of candidates) {
    if (totalChars >= MAX_AUTH_TOTAL_CHARS) break;
    let blob;
    try {
      blob = await githubFetch(`/repos/${owner}/${repo}/git/blobs/${entry.sha}`, githubToken);
    } catch (err) {
      continue; // best-effort: skip files that fail to fetch
    }
    if (blob.encoding !== 'base64' || typeof blob.content !== 'string') continue;

    let content;
    try {
      content = Buffer.from(blob.content, 'base64').toString('utf-8');
    } catch (err) {
      continue;
    }

    const remainingBudget = MAX_AUTH_TOTAL_CHARS - totalChars;
    const cap = Math.min(MAX_AUTH_CHARS_PER_FILE, remainingBudget);
    if (content.length > cap) {
      content = `${content.slice(0, cap)}\n...[truncated]`;
    }

    candidateFiles.push({ path: entry.path, content });
    totalChars += content.length;
  }

  return { candidateFiles, repoFullName: `${owner}/${repo}` };
}

// Deliberately smaller than fetchProjectMetadataFiles' per-file cap - this is
// used to fetch a small, targeted set of files implicated by a specific error
// (stack trace paths, not a broad repo scan), for the Troubleshooting Agent's
// code-fix LLM step to read in full.
const MAX_TROUBLESHOOTING_FILE_CHARS = 6000;

/**
 * Reads a single file's content off the repo's default branch. Used by the
 * Deployment Troubleshooting Agent to fetch only the specific file(s) a
 * parsed error/stack trace points at, rather than scanning the whole repo.
 */
async function fetchFileContent(repoUrl, path, githubToken) {
  if (!githubToken) {
    throw new GithubFileError('A GitHub token is required to read this file.', 401);
  }
  const { owner, repo } = parseRepoUrl(repoUrl);

  const fileData = await githubFetch(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, githubToken);
  if (fileData.encoding !== 'base64' || typeof fileData.content !== 'string') {
    throw new GithubFileError(`Could not read "${path}" as a text file.`, 422);
  }

  let content = Buffer.from(fileData.content, 'base64').toString('utf-8');
  let truncated = false;
  if (content.length > MAX_TROUBLESHOOTING_FILE_CHARS) {
    content = content.slice(0, MAX_TROUBLESHOOTING_FILE_CHARS);
    truncated = true;
  }

  return { path, content, truncated, sha: fileData.sha };
}

// Safety cap: a single automated troubleshooting fix should never touch a
// sprawling set of files - if the model wants to change more than this, the
// fix is treated as unreliable rather than committed.
const COMMIT_MAX_FILES = 5;

/**
 * Commits one or more full-file replacements directly to a branch (default:
 * the repo's default branch) using the standard GitHub "commit multiple
 * files" REST sequence: read the branch ref -> read its commit's tree ->
 * create a blob per file -> create a new tree on top of the base tree ->
 * create a commit -> move the branch ref to it. No PR is opened - this is
 * used only after the user has explicitly approved the exact file contents
 * being pushed.
 */
async function commitFiles(repoUrl, { files, message, branch } = {}, githubToken) {
  if (!githubToken) {
    throw new GithubFileError('A GitHub token is required to push changes.', 401);
  }
  if (!Array.isArray(files) || files.length === 0) {
    throw new GithubFileError('No files were provided to commit.', 400);
  }
  if (files.length > COMMIT_MAX_FILES) {
    throw new GithubFileError(`Refusing to commit more than ${COMMIT_MAX_FILES} files in a single automated fix.`, 400);
  }
  for (const file of files) {
    if (!file || typeof file.path !== 'string' || typeof file.content !== 'string') {
      throw new GithubFileError('Each file to commit needs a "path" and "content" string.', 400);
    }
  }

  const { owner, repo } = parseRepoUrl(repoUrl);
  const repoInfo = await githubFetch(`/repos/${owner}/${repo}`, githubToken);
  const targetBranch = branch || repoInfo.default_branch || 'main';

  const refData = await githubFetch(`/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(targetBranch)}`, githubToken);
  const latestCommitSha = refData.object.sha;

  const latestCommit = await githubFetch(`/repos/${owner}/${repo}/git/commits/${latestCommitSha}`, githubToken);
  const baseTreeSha = latestCommit.tree.sha;

  const treeEntries = [];
  for (const file of files) {
    const blob = await githubFetch(`/repos/${owner}/${repo}/git/blobs`, githubToken, {
      method: 'POST',
      body: { content: file.content, encoding: 'utf-8' },
    });
    treeEntries.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
  }

  const newTree = await githubFetch(`/repos/${owner}/${repo}/git/trees`, githubToken, {
    method: 'POST',
    body: { base_tree: baseTreeSha, tree: treeEntries },
  });

  const newCommit = await githubFetch(`/repos/${owner}/${repo}/git/commits`, githubToken, {
    method: 'POST',
    body: {
      message: message || 'CloudPilot: automated deployment fix',
      tree: newTree.sha,
      parents: [latestCommitSha],
    },
  });

  await githubFetch(`/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(targetBranch)}`, githubToken, {
    method: 'PATCH',
    body: { sha: newCommit.sha },
  });

  return {
    sha: newCommit.sha,
    url: `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`,
    branch: targetBranch,
  };
}

module.exports = {
  fetchProjectMetadataFiles,
  scanRepoSource,
  discoverAuthRoutes,
  fetchFileContent,
  commitFiles,
  GithubFileError,
};
