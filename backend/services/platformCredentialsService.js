const { encrypt, decrypt } = require('../utils/tokenCrypto');

function storeVercelCredentials(user, accessToken) {
  user.vercel = {
    accessToken: encrypt(accessToken),
    connectedAt: new Date(),
  };
}

function storeRenderCredentials(user, apiKey) {
  user.render = {
    apiKey: encrypt(apiKey),
    connectedAt: new Date(),
  };
}

function getDecryptedVercelToken(user) {
  if (!user.vercel?.accessToken) return null;
  return decrypt(user.vercel.accessToken);
}

function getDecryptedRenderApiKey(user) {
  if (!user.render?.apiKey) return null;
  return decrypt(user.render.apiKey);
}

function clearVercelCredentials(user) {
  user.vercel = undefined;
}

function clearRenderCredentials(user) {
  user.render = undefined;
}

module.exports = {
  storeVercelCredentials,
  storeRenderCredentials,
  getDecryptedVercelToken,
  getDecryptedRenderApiKey,
  clearVercelCredentials,
  clearRenderCredentials,
};
