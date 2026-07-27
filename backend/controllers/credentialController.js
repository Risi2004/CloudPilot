const credentialService = require('../services/credentialService');
const { CredentialCryptoError } = require('../utils/crypto');
const { RenderApiError } = require('../services/renderApiService');
const { VercelApiError } = require('../services/vercelApiService');

const getCredentials = async (req, res) => {
  try {
    const credentials = await credentialService.listCredentials(req.user._id);
    return res.status(200).json({ credentials });
  } catch (err) {
    console.error('Failed to load platform credentials:', err);
    return res.status(500).json({ message: 'Failed to load connected platforms.' });
  }
};

const connectCredential = async (req, res) => {
  const { platform, apiKey, teamId } = req.body;
  if (!platform) {
    return res.status(400).json({ message: 'platform is required.' });
  }

  try {
    const credential = await credentialService.connectCredential(req.user._id, platform, apiKey, { teamId });
    return res.status(200).json({ credential });
  } catch (err) {
    if (err instanceof credentialService.CredentialError) {
      return res.status(err.statusCode || 400).json({ message: err.message });
    }
    if (err instanceof RenderApiError || err instanceof VercelApiError) {
      return res.status(err.statusCode === 401 ? 401 : 502).json({ message: `Could not validate this key: ${err.message}` });
    }
    if (err instanceof CredentialCryptoError) {
      return res.status(503).json({ message: err.message });
    }
    console.error('Failed to connect platform credential:', err);
    return res.status(500).json({ message: 'Failed to connect this platform. Please try again.' });
  }
};

const deleteCredential = async (req, res) => {
  const { platform } = req.params;
  try {
    await credentialService.deleteCredential(req.user._id, platform);
    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('Failed to remove platform credential:', err);
    return res.status(500).json({ message: 'Failed to remove this platform connection.' });
  }
};

module.exports = { getCredentials, connectCredential, deleteCredential };
