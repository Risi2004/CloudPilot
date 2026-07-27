const crypto = require('crypto');

class CredentialCryptoError extends Error {}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getKey() {
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) {
    throw new CredentialCryptoError(
      'CREDENTIALS_ENCRYPTION_KEY is not configured. Set a 32-byte base64 key in the backend environment.'
    );
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new CredentialCryptoError(
      'CREDENTIALS_ENCRYPTION_KEY must decode to exactly 32 bytes (base64-encoded). Generate one with `openssl rand -base64 32`.'
    );
  }
  return key;
}

function encrypt(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(':');
}

function decrypt(stored) {
  const key = getKey();
  const parts = String(stored || '').split(':');
  if (parts.length !== 3) {
    throw new CredentialCryptoError('Stored credential is malformed and cannot be decrypted.');
  }
  const [ivB64, authTagB64, ciphertextB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

function maskKey(rawKey) {
  const str = String(rawKey || '');
  if (str.length <= 4) return '••••';
  return `••••••••${str.slice(-4)}`;
}

module.exports = { encrypt, decrypt, maskKey, CredentialCryptoError };
