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

module.exports = { fetchProjectMetadataFiles, GithubFileError };
