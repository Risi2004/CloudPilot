const crypto = require('crypto');

function getEncryptionKey() {
  // BUG-002 fix: Never fall back to a hardcoded string.
  // TOKEN_ENCRYPTION_KEY is the preferred key; JWT_SECRET is accepted as a
  // secondary fallback so existing encrypted values remain readable after an
  // upgrade.  Both missing at startup is caught by index.js.
  const secret = process.env.TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      '[CloudPilot] TOKEN_ENCRYPTION_KEY (or JWT_SECRET) is not set. ' +
      'Cannot encrypt/decrypt platform credentials.',
    );
  }
  return crypto.createHash('sha256').update(secret).digest();
}

function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decrypt(payload) {
  const buffer = Buffer.from(payload, 'base64');
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
