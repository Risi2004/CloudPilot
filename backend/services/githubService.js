const jwt = require('jsonwebtoken');
const { encrypt, decrypt } = require('../utils/tokenCrypto');

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_API_BASE = 'https://api.github.com';

function getJwtSecret() {
  return process.env.JWT_SECRET || 'jwt_secret_fallback';
}

function requireGitHubConfig() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const callbackUrl = process.env.GITHUB_CALLBACK_URL;

  if (!clientId || !clientSecret || !callbackUrl) {
    throw new Error(
      'GitHub OAuth is not configured. Set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_CALLBACK_URL in backend .env.',
    );
  }

  return { clientId, clientSecret, callbackUrl };
}

function buildAuthorizeUrl(userId) {
  const { clientId, callbackUrl } = requireGitHubConfig();
  const state = jwt.sign({ userId, purpose: 'github_oauth' }, getJwtSecret(), { expiresIn: '10m' });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: 'read:user repo',
    state,
  });

  return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
}

function verifyOAuthState(state) {
  const decoded = jwt.verify(state, getJwtSecret());
  if (decoded.purpose !== 'github_oauth' || !decoded.userId) {
    throw new Error('Invalid OAuth state.');
  }
  return decoded.userId;
}

async function exchangeCodeForToken(code) {
  const { clientId, clientSecret, callbackUrl } = requireGitHubConfig();

  const response = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: callbackUrl,
    }),
  });

  const payload = await response.json();
  if (!response.ok || payload.error) {
    throw new Error(payload.error_description || payload.error || 'GitHub token exchange failed.');
  }
  if (!payload.access_token) {
    throw new Error('GitHub did not return an access token.');
  }

  return {
    accessToken: payload.access_token,
    scope: payload.scope || '',
  };
}

async function githubApiRequest(path, accessToken, options = {}) {
  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let detail = `GitHub API error (${response.status})`;
    try {
      const body = await response.json();
      detail = body.message || detail;
    } catch {
      // ignore parse errors
    }
    const error = new Error(detail);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

async function fetchGitHubProfile(accessToken) {
  return githubApiRequest('/user', accessToken);
}

async function fetchAllUserRepos(accessToken) {
  const repos = [];
  let page = 1;

  while (page <= 10) {
    const batch = await githubApiRequest(
      `/user/repos?affiliation=owner,collaborator,organization_member&sort=updated&direction=desc&per_page=100&page=${page}`,
      accessToken,
    );

    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    repos.push(...batch);
    if (batch.length < 100) {
      break;
    }
    page += 1;
  }

  return repos.map((repo) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    htmlUrl: repo.html_url,
    description: repo.description,
    private: repo.private,
    defaultBranch: repo.default_branch,
    language: repo.language,
    stars: repo.stargazers_count,
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
  }));
}

function storeGitHubConnection(user, profile, accessToken, scope) {
  user.github = {
    userId: String(profile.id),
    username: profile.login,
    accessToken: encrypt(accessToken),
    scope,
    connectedAt: new Date(),
  };
}

function getDecryptedAccessToken(user) {
  if (!user.github?.accessToken) {
    return null;
  }
  return decrypt(user.github.accessToken);
}

function clearGitHubConnection(user) {
  user.github = undefined;
}

module.exports = {
  buildAuthorizeUrl,
  verifyOAuthState,
  exchangeCodeForToken,
  fetchGitHubProfile,
  fetchAllUserRepos,
  storeGitHubConnection,
  getDecryptedAccessToken,
  clearGitHubConnection,
};
