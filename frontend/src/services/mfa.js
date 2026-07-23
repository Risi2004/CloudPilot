const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function persistAuthSession(data) {
  if (!data?.token || !data?.user) return;
  localStorage.setItem('token', data.token);
  localStorage.setItem('email', data.user.email);
  if (data.user.fullName) {
    localStorage.setItem('fullName', data.user.fullName);
  } else {
    localStorage.removeItem('fullName');
  }
  if (data.user.profileImageKey) {
    localStorage.setItem('profileImageKey', data.user.profileImageKey);
  } else {
    localStorage.removeItem('profileImageKey');
  }
  if (data.user.role) {
    localStorage.setItem('role', data.user.role);
  } else {
    localStorage.removeItem('role');
  }
  if (data.user.plan) {
    localStorage.setItem('plan', data.user.plan);
  } else {
    localStorage.removeItem('plan');
  }
  localStorage.removeItem('profileImage');
}

export async function setupMfa() {
  const res = await fetch(`${API_URL}/api/auth/mfa/setup`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to start MFA setup.');
  return data;
}

export async function enableMfa(code) {
  const res = await fetch(`${API_URL}/api/auth/mfa/enable`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify({ code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to enable MFA.');
  return data;
}

export async function disableMfa(code) {
  const res = await fetch(`${API_URL}/api/auth/mfa/disable`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify({ code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to disable MFA.');
  return data;
}

export async function verifyMfaLogin({ mfaToken, code, rememberDevice }) {
  const res = await fetch(`${API_URL}/api/auth/mfa/verify-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ mfaToken, code, rememberDevice: !!rememberDevice }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'MFA verification failed.');
  return data;
}

export async function getMfaStatus() {
  const res = await fetch(`${API_URL}/api/auth/mfa/status`, {
    method: 'GET',
    headers: authHeaders(),
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load MFA status.');
  return data;
}

export async function regenerateBackupCodes(code) {
  const res = await fetch(`${API_URL}/api/auth/mfa/regenerate-backup-codes`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify({ code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to regenerate recovery codes.');
  return data;
}
