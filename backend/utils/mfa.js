const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const otplib = require('otplib');
const QRCode = require('qrcode');
const { encrypt, decrypt } = require('./tokenCrypto');

const MFA_ISSUER = 'CloudPilot';
const TRUSTED_DEVICE_COOKIE = 'trusted_device';
const TRUSTED_DEVICE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MFA_CHALLENGE_EXPIRES = '10m';
const PENDING_SECRET_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getJwtSecret() {
  return process.env.JWT_SECRET || 'jwt_secret_fallback';
}

function generateTotpSecret(email) {
  const secret = otplib.generateSecret();
  const otpauthUrl = otplib.generateURI({
    issuer: MFA_ISSUER,
    label: email,
    secret,
  });
  return { secret, otpauthUrl };
}

async function generateQrDataUrl(otpauthUrl) {
  return QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 220,
  });
}

function encryptSecret(plaintext) {
  return encrypt(plaintext);
}

function decryptSecret(payload) {
  return decrypt(payload);
}

function verifyTotp(secret, token) {
  if (!secret || !token) return false;
  const cleaned = String(token).replace(/\s/g, '');
  try {
    const result = otplib.verifySync({
      token: cleaned,
      secret,
      // Increased from 30 (1 step) to 150 (5 steps / 2.5 minutes) to be
      // highly tolerant of clock drift between the user's device and server.
      epochTolerance: 150,
    });
    return !!(result && result.valid);
  } catch {
    return false;
  }
}

async function generateBackupCodes(count = 10) {
  const codes = [];
  const hashed = [];
  for (let i = 0; i < count; i += 1) {
    const code = crypto.randomBytes(5).toString('hex').toUpperCase(); // 10 hex chars
    codes.push(code);
    hashed.push({ hash: await bcrypt.hash(code, 10), usedAt: null });
  }
  return { codes, hashed };
}

async function consumeBackupCode(backupCodes, code) {
  if (!Array.isArray(backupCodes) || !code) return { ok: false, codes: backupCodes };
  const cleaned = String(code).replace(/\s|-/g, '').toUpperCase();
  for (let i = 0; i < backupCodes.length; i += 1) {
    const entry = backupCodes[i];
    if (entry.usedAt) continue;
    const match = await bcrypt.compare(cleaned, entry.hash);
    if (match) {
      const next = backupCodes.map((c, idx) =>
        idx === i ? { hash: c.hash, usedAt: new Date() } : c
      );
      return { ok: true, codes: next };
    }
  }
  return { ok: false, codes: backupCodes };
}

async function verifyTotpOrBackup(user, code) {
  if (!code) return { ok: false, usedBackup: false };

  if (user.totpSecret) {
    const secret = decryptSecret(user.totpSecret);
    if (verifyTotp(secret, code)) {
      return { ok: true, usedBackup: false };
    }
  }

  const result = await consumeBackupCode(user.backupCodes || [], code);
  if (result.ok) {
    user.backupCodes = result.codes;
    return { ok: true, usedBackup: true };
  }

  return { ok: false, usedBackup: false };
}

function createSessionToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
}

function createMfaChallengeToken(user) {
  return jwt.sign(
    { id: user._id, purpose: 'mfa_challenge' },
    getJwtSecret(),
    { expiresIn: MFA_CHALLENGE_EXPIRES }
  );
}

function verifyMfaChallengeToken(token) {
  const decoded = jwt.verify(token, getJwtSecret());
  if (decoded.purpose !== 'mfa_challenge' || !decoded.id) {
    throw new Error('Invalid MFA challenge token');
  }
  return decoded;
}

function hashTrustedDeviceToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createTrustedDeviceToken() {
  const deviceId = crypto.randomUUID();
  const rawToken = crypto.randomBytes(32).toString('hex');
  const cookieValue = `${deviceId}.${rawToken}`;
  return {
    deviceId,
    cookieValue,
    tokenHash: hashTrustedDeviceToken(cookieValue),
    expiresAt: new Date(Date.now() + TRUSTED_DEVICE_MAX_AGE_MS),
  };
}

function pruneExpiredTrustedDevices(user) {
  const now = Date.now();
  if (!Array.isArray(user.trustedDevices)) {
    user.trustedDevices = [];
    return;
  }
  user.trustedDevices = user.trustedDevices.filter(
    (d) => d.expiresAt && new Date(d.expiresAt).getTime() > now
  );
}

function findTrustedDevice(user, cookieValue) {
  if (!cookieValue || !user) return null;
  pruneExpiredTrustedDevices(user);
  const tokenHash = hashTrustedDeviceToken(cookieValue);
  const deviceId = String(cookieValue).split('.')[0];
  return (
    user.trustedDevices.find(
      (d) => d.deviceId === deviceId && d.tokenHash === tokenHash
    ) || null
  );
}

function getTrustedDeviceCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: TRUSTED_DEVICE_MAX_AGE_MS,
    path: '/',
  };
}

function clearTrustedDeviceCookie(res) {
  res.clearCookie(TRUSTED_DEVICE_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

function setTrustedDeviceCookie(res, cookieValue) {
  res.cookie(TRUSTED_DEVICE_COOKIE, cookieValue, getTrustedDeviceCookieOptions());
}

function isPendingSecretExpired(user) {
  if (!user.pendingTotpSecretCreatedAt) return true;
  return (
    Date.now() - new Date(user.pendingTotpSecretCreatedAt).getTime() >
    PENDING_SECRET_TTL_MS
  );
}

function userPublicPayload(user) {
  return {
    email: user.email,
    fullName: user.fullName,
    profileImageKey: user.profileImageKey,
    role: user.role,
    plan: user.plan,
    mfaEnabled: !!user.mfaEnabled,
  };
}

module.exports = {
  MFA_ISSUER,
  TRUSTED_DEVICE_COOKIE,
  TRUSTED_DEVICE_MAX_AGE_MS,
  PENDING_SECRET_TTL_MS,
  generateTotpSecret,
  generateQrDataUrl,
  encryptSecret,
  decryptSecret,
  verifyTotp,
  generateBackupCodes,
  consumeBackupCode,
  verifyTotpOrBackup,
  createSessionToken,
  createMfaChallengeToken,
  verifyMfaChallengeToken,
  createTrustedDeviceToken,
  findTrustedDevice,
  pruneExpiredTrustedDevices,
  setTrustedDeviceCookie,
  clearTrustedDeviceCookie,
  isPendingSecretExpired,
  userPublicPayload,
};
