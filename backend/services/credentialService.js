const PlatformCredential = require('../models/PlatformCredential');
const { encrypt, decrypt, maskKey } = require('../utils/crypto');
const renderApiService = require('./renderApiService');
const vercelApiService = require('./vercelApiService');

class CredentialError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function validateKey(platform, apiKey, { teamId } = {}) {
  if (platform === 'render') {
    const { ownerId, accountLabel } = await renderApiService.getWorkspaceOwnerId(apiKey);
    return { accountLabel, metadata: { ownerId } };
  }
  if (platform === 'vercel') {
    const { accountLabel } = await vercelApiService.getAuthenticatedUser(apiKey);
    return { accountLabel, metadata: teamId ? { teamId } : {} };
  }
  throw new CredentialError(`Unsupported platform "${platform}".`, 400);
}

async function connectCredential(userId, platform, apiKey, options = {}) {
  if (!['render', 'vercel'].includes(platform)) {
    throw new CredentialError(`Unsupported platform "${platform}".`, 400);
  }
  if (!apiKey || !String(apiKey).trim()) {
    throw new CredentialError('An API key is required.', 400);
  }

  const trimmedKey = String(apiKey).trim();
  const { accountLabel, metadata } = await validateKey(platform, trimmedKey, options);

  const credential = await PlatformCredential.findOneAndUpdate(
    { userId, platform },
    {
      userId,
      platform,
      encryptedApiKey: encrypt(trimmedKey),
      maskedKey: maskKey(trimmedKey),
      accountLabel,
      metadata,
      lastValidatedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  return serializeCredential(credential);
}

function serializeCredential(doc) {
  return {
    platform: doc.platform,
    maskedKey: doc.maskedKey,
    accountLabel: doc.accountLabel,
    lastValidatedAt: doc.lastValidatedAt,
    connectedAt: doc.createdAt,
  };
}

async function listCredentials(userId) {
  const docs = await PlatformCredential.find({ userId });
  return docs.map(serializeCredential);
}

async function deleteCredential(userId, platform) {
  await PlatformCredential.deleteOne({ userId, platform });
}

async function getDecryptedKey(userId, platform) {
  const doc = await PlatformCredential.findOne({ userId, platform });
  if (!doc) {
    throw new CredentialError(`No ${platform} API key is connected for this account.`, 404);
  }
  return { apiKey: decrypt(doc.encryptedApiKey), metadata: doc.metadata || {} };
}

module.exports = {
  CredentialError,
  connectCredential,
  listCredentials,
  deleteCredential,
  getDecryptedKey,
};
