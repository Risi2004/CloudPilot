const User = require('../models/User');
const {
  generateTotpSecret,
  generateQrDataUrl,
  encryptSecret,
  decryptSecret,
  verifyTotp,
  generateBackupCodes,
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
  TRUSTED_DEVICE_COOKIE,
} = require('../utils/mfa');

/**
 * Start MFA enrollment: generate TOTP secret + QR (does not enable MFA yet).
 */
const setupMfa = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select(
      '+pendingTotpSecret +pendingTotpSecretCreatedAt +totpSecret +mfaEnabled'
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.mfaEnabled) {
      return res.status(400).json({ message: 'MFA is already enabled on this account.' });
    }

    const { secret, otpauthUrl } = generateTotpSecret(user.email);
    user.pendingTotpSecret = encryptSecret(secret);
    user.pendingTotpSecretCreatedAt = new Date();
    await user.save();

    const qrDataUrl = await generateQrDataUrl(otpauthUrl);

    res.status(200).json({
      message: 'Scan the QR code with your authenticator app, then enter a 6-digit code to enable MFA.',
      secret,
      otpauthUrl,
      qrDataUrl,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Confirm first TOTP and enable MFA; return one-time backup codes.
 */
const enableMfa = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'A 6-digit authenticator code is required.' });
    }

    const user = await User.findById(req.user.id).select(
      '+pendingTotpSecret +pendingTotpSecretCreatedAt +totpSecret +backupCodes +mfaEnabled'
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.mfaEnabled) {
      return res.status(400).json({ message: 'MFA is already enabled on this account.' });
    }

    if (!user.pendingTotpSecret || isPendingSecretExpired(user)) {
      return res.status(400).json({
        message: 'MFA setup expired or not started. Please begin setup again.',
      });
    }

    const pendingSecret = decryptSecret(user.pendingTotpSecret);
    if (!verifyTotp(pendingSecret, code)) {
      return res.status(400).json({ message: 'Invalid authenticator code. Please try again.' });
    }

    const { codes, hashed } = await generateBackupCodes(10);

    user.totpSecret = encryptSecret(pendingSecret);
    user.pendingTotpSecret = null;
    user.pendingTotpSecretCreatedAt = null;
    user.backupCodes = hashed;
    user.mfaEnabled = true;
    await user.save();

    res.status(200).json({
      message: 'MFA enabled successfully. Store your recovery codes in a safe place.',
      mfaEnabled: true,
      backupCodes: codes,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Disable MFA after verifying TOTP or unused backup code.
 */
const disableMfa = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Authenticator or recovery code is required.' });
    }

    const user = await User.findById(req.user.id).select(
      '+totpSecret +backupCodes +trustedDevices +mfaEnabled'
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!user.mfaEnabled) {
      return res.status(400).json({ message: 'MFA is not enabled on this account.' });
    }

    const verified = await verifyTotpOrBackup(user, code);
    if (!verified.ok) {
      return res.status(400).json({ message: 'Invalid authenticator or recovery code.' });
    }

    user.mfaEnabled = false;
    user.totpSecret = null;
    user.pendingTotpSecret = null;
    user.pendingTotpSecretCreatedAt = null;
    user.backupCodes = [];
    user.trustedDevices = [];
    user.markModified('backupCodes');
    user.markModified('trustedDevices');
    await user.save();

    clearTrustedDeviceCookie(res);

    res.status(200).json({
      message: 'MFA has been disabled for this account.',
      mfaEnabled: false,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Complete login after MFA challenge (TOTP or backup code).
 */
const verifyMfaLogin = async (req, res, next) => {
  try {
    const { mfaToken, code, rememberDevice } = req.body;
    if (!mfaToken || !code) {
      return res.status(400).json({ message: 'MFA challenge token and code are required.' });
    }

    let decoded;
    try {
      decoded = verifyMfaChallengeToken(mfaToken);
    } catch {
      return res.status(401).json({ message: 'MFA challenge expired or invalid. Please log in again.' });
    }

    const user = await User.findById(decoded.id).select(
      '+totpSecret +backupCodes +trustedDevices +mfaEnabled'
    );
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' });
    }

    if (user.status === 'Suspended') {
      return res.status(403).json({
        message:
          'Your account has been suspended by an administrator. For further information, please contact support.',
      });
    }

    if (!user.mfaEnabled) {
      return res.status(400).json({ message: 'MFA is not enabled on this account.' });
    }

    const verified = await verifyTotpOrBackup(user, code);
    if (!verified.ok) {
      return res.status(401).json({ message: 'Invalid authenticator or recovery code.' });
    }

    if (rememberDevice) {
      pruneExpiredTrustedDevices(user);
      const device = createTrustedDeviceToken();
      user.trustedDevices.push({
        deviceId: device.deviceId,
        tokenHash: device.tokenHash,
        label: req.headers['user-agent'] ? String(req.headers['user-agent']).slice(0, 120) : null,
        createdAt: new Date(),
        expiresAt: device.expiresAt,
        lastUsedAt: new Date(),
      });
      user.markModified('trustedDevices');
      setTrustedDeviceCookie(res, device.cookieValue);
    }

    if (verified.usedBackup) {
      user.markModified('backupCodes');
    }

    await user.save();

    const token = createSessionToken(user);
    res.status(200).json({
      message: 'MFA verification successful.',
      token,
      user: userPublicPayload(user),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Return MFA enrollment status for the authenticated user.
 */
const getMfaStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('mfaEnabled');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.status(200).json({ mfaEnabled: !!user.mfaEnabled });
  } catch (err) {
    next(err);
  }
};

/**
 * Rotate backup codes after verifying current TOTP.
 */
const regenerateBackupCodes = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'A 6-digit authenticator code is required.' });
    }

    const user = await User.findById(req.user.id).select('+totpSecret +backupCodes +mfaEnabled');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!user.mfaEnabled || !user.totpSecret) {
      return res.status(400).json({ message: 'MFA is not enabled on this account.' });
    }

    const secret = decryptSecret(user.totpSecret);
    if (!verifyTotp(secret, code)) {
      return res.status(400).json({ message: 'Invalid authenticator code.' });
    }

    const { codes, hashed } = await generateBackupCodes(10);
    user.backupCodes = hashed;
    await user.save();

    res.status(200).json({
      message: 'Recovery codes regenerated. Previous codes are no longer valid.',
      backupCodes: codes,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Shared post-credential gate used by password and Firebase login.
 * Returns session JWT if MFA off or device trusted; otherwise mfaRequired challenge.
 */
async function resolveLoginAfterCredentials(user, req, res) {
  // Ensure we have MFA + trusted device fields when callers used a plain find
  if (user.mfaEnabled === undefined || user.trustedDevices === undefined) {
    const full = await User.findById(user._id).select('+trustedDevices +mfaEnabled');
    if (!full) {
      return res.status(401).json({ message: 'Unauthorized: Invalid credentials.' });
    }
    user = full;
  }

  if (!user.mfaEnabled) {
    const token = createSessionToken(user);
    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: userPublicPayload(user),
    });
  }

  const cookieValue = req.cookies?.[TRUSTED_DEVICE_COOKIE];
  const device = findTrustedDevice(user, cookieValue);
  if (device) {
    device.lastUsedAt = new Date();
    user.markModified('trustedDevices');
    await user.save();
    const token = createSessionToken(user);
    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: userPublicPayload(user),
    });
  }

  const mfaToken = createMfaChallengeToken(user);
  return res.status(200).json({
    message: 'Multi-factor authentication required.',
    mfaRequired: true,
    mfaToken,
  });
}

module.exports = {
  setupMfa,
  enableMfa,
  disableMfa,
  verifyMfaLogin,
  getMfaStatus,
  regenerateBackupCodes,
  resolveLoginAfterCredentials,
};
