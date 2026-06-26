const User = require('../models/User');
const {
  buildAuthorizeUrl,
  verifyOAuthState,
  exchangeCodeForToken,
  fetchGitHubProfile,
  fetchAllUserRepos,
  storeGitHubConnection,
  getDecryptedAccessToken,
  clearGitHubConnection,
} = require('../services/githubService');

function frontendRedirect(path) {
  const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${base}${path}`;
}

const getConnectUrl = async (req, res, next) => {
  try {
    const url = buildAuthorizeUrl(String(req.user._id));
    res.status(200).json({ url });
  } catch (err) {
    next(err);
  }
};

const handleCallback = async (req, res) => {
  const { code, state, error, error_description: errorDescription } = req.query;

  if (error) {
    const message = encodeURIComponent(errorDescription || error);
    return res.redirect(frontendRedirect(`/repositories?github=error&message=${message}`));
  }

  if (!code || !state) {
    return res.redirect(frontendRedirect('/repositories?github=error&message=Missing%20OAuth%20parameters'));
  }

  try {
    const userId = verifyOAuthState(state);
    const user = await User.findById(userId);
    if (!user) {
      return res.redirect(frontendRedirect('/repositories?github=error&message=User%20not%20found'));
    }

    const tokenData = await exchangeCodeForToken(code);
    const profile = await fetchGitHubProfile(tokenData.accessToken);
    storeGitHubConnection(user, profile, tokenData.accessToken, tokenData.scope);
    await user.save();

    return res.redirect(frontendRedirect('/repositories?github=connected'));
  } catch (err) {
    const message = encodeURIComponent(err.message || 'GitHub connection failed');
    return res.redirect(frontendRedirect(`/repositories?github=error&message=${message}`));
  }
};

const getConnectionStatus = async (req, res) => {
  const github = req.user.github;
  res.status(200).json({
    connected: Boolean(github?.username && github?.userId),
    username: github?.username || null,
    connectedAt: github?.connectedAt || null,
  });
};

const listRepositories = async (req, res, next) => {
  let user;
  try {
    user = await User.findById(req.user._id).select('+github.accessToken');
    let accessToken;
    try {
      accessToken = getDecryptedAccessToken(user);
    } catch {
      clearGitHubConnection(user);
      await user.save();
      return res.status(401).json({ message: 'GitHub token invalid. Please connect GitHub again.' });
    }

    if (!accessToken) {
      return res.status(400).json({ message: 'GitHub is not connected. Connect your account first.' });
    }

    const repos = await fetchAllUserRepos(accessToken);
    res.status(200).json({ repos, total: repos.length });
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      if (user) {
        clearGitHubConnection(user);
        await user.save();
      }
      return res.status(401).json({
        message: 'GitHub authorization expired. Please connect GitHub again.',
      });
    }
    next(err);
  }
};

const disconnectGitHub = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    clearGitHubConnection(user);
    await user.save();
    res.status(200).json({ message: 'GitHub disconnected.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getConnectUrl,
  handleCallback,
  getConnectionStatus,
  listRepositories,
  disconnectGitHub,
};
