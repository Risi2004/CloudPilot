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

async function githubFetch(path, githubToken) {
  const response = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `token ${githubToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
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
  return response.json();
}

async function fetchProjectMetadataFiles(repoUrl, githubToken) {
  if (!githubToken) {
    throw new GithubFileError('A GitHub token is required to analyze this repository.', 401);
  }

  const { owner, repo } = parseRepoUrl(repoUrl);
  const rootEntries = await githubFetch(`/repos/${owner}/${repo}/contents/`, githubToken);

  if (!Array.isArray(rootEntries)) {
    throw new GithubFileError('Unexpected response while listing repository contents.', 502);
  }

  const candidateLookup = new Set(CANDIDATE_FILES.map((f) => f.toLowerCase()));
  const matches = rootEntries.filter(
    (entry) => entry.type === 'file' && candidateLookup.has(entry.name.toLowerCase())
  );

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
 * Recursively walks the repo's default branch tree and regex-scans source files
 * for environment-variable reads (process.env.X, import.meta.env.X, os.getenv, etc).
 * Best-effort: caps the number/size of files fetched to keep this fast on large repos.
 */
async function scanRepoForEnvVars(repoUrl, githubToken) {
  const { owner, repo } = parseRepoUrl(repoUrl);

  const repoInfo = await githubFetch(`/repos/${owner}/${repo}`, githubToken);
  const branch = repoInfo.default_branch || 'main';

  const treeData = await githubFetch(
    `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    githubToken
  );

  const tree = Array.isArray(treeData.tree) ? treeData.tree : [];

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
  }

  return Array.from(keyToFiles.entries())
    .map(([key, files]) => ({ key, files: Array.from(files) }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

module.exports = { fetchProjectMetadataFiles, scanRepoForEnvVars, GithubFileError };
