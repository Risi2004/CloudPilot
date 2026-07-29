const FETCH_TIMEOUT_MS = 15000;
const TEST_EMAIL_DOMAIN = 'cloudpilot-verify.example.com';

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function trimTrailingSlash(url) {
  return String(url || '').replace(/\/$/, '');
}

function generateTestEmail() {
  const stamp = Date.now().toString(36);
  return `cloudpilot-verify+${stamp}@${TEST_EMAIL_DOMAIN}`;
}

function getNestedField(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), obj);
}

function buildTestBody(fields, email, password) {
  const body = {};
  if (fields && fields.email) body[fields.email] = email;
  if (fields && fields.password) body[fields.password] = password;
  if (fields && fields.extra && typeof fields.extra === 'object') Object.assign(body, fields.extra);
  return body;
}

async function checkReachable(url) {
  if (!url) return { status: 'fail', message: 'No live URL is known for this component yet.' };
  try {
    const res = await fetchWithTimeout(url, { method: 'GET' });
    if (res.status >= 200 && res.status < 400) {
      return { status: 'pass', message: `Responded with HTTP ${res.status}.` };
    }
    return { status: 'fail', message: `Responded with HTTP ${res.status}.` };
  } catch (err) {
    return { status: 'fail', message: `Could not reach ${url}: ${err.message}` };
  }
}

function checkHttps(url) {
  if (!url) return { status: 'fail', message: 'No live URL is known for this component yet.' };
  if (url.startsWith('https://')) return { status: 'pass', message: 'Uses HTTPS.' };
  return { status: 'fail', message: `URL does not use HTTPS: ${url}` };
}

const HEALTH_CANDIDATE_PATHS = ['/health', '/api/health', '/healthz', '/status', '/'];

async function checkHealthEndpoint(backendUrl) {
  if (!backendUrl) return { status: 'fail', message: 'No backend URL is known yet.' };
  const base = trimTrailingSlash(backendUrl);
  for (const path of HEALTH_CANDIDATE_PATHS) {
    try {
      const res = await fetchWithTimeout(`${base}${path}`);
      if (res.status >= 200 && res.status < 400) {
        return { status: 'pass', message: `Health check responded at ${path || '/'} (HTTP ${res.status}).` };
      }
    } catch (err) {
      // try the next candidate path
    }
  }
  return {
    status: 'fail',
    message: `No health endpoint responded (tried ${HEALTH_CANDIDATE_PATHS.join(', ')}).`,
  };
}

async function checkCors(backendUrl, frontendOrigin) {
  if (!backendUrl || !frontendOrigin) {
    return { status: 'skipped', message: 'Missing backend URL or frontend origin to test CORS against.' };
  }
  try {
    const res = await fetchWithTimeout(backendUrl, {
      method: 'GET',
      headers: { Origin: frontendOrigin },
    });
    const allowOrigin = res.headers.get('access-control-allow-origin');
    if (allowOrigin === '*' || allowOrigin === frontendOrigin) {
      return { status: 'pass', message: `Access-Control-Allow-Origin: ${allowOrigin}` };
    }
    return {
      status: 'fail',
      message: `Access-Control-Allow-Origin is "${allowOrigin || '(not set)'}" - expected it to allow ${frontendOrigin}.`,
    };
  } catch (err) {
    return { status: 'fail', message: `CORS check request failed: ${err.message}` };
  }
}

function checkEnvVarsPresent(expectedKeys, actualEnvVars) {
  const actualKeys = new Set((actualEnvVars || []).map((v) => v.key));
  const missing = (expectedKeys || []).filter((k) => !actualKeys.has(k));
  if (missing.length === 0) {
    return { status: 'pass', message: 'All expected environment variables are present on the deployed service.' };
  }
  return { status: 'fail', message: `Missing environment variables: ${missing.join(', ')}.` };
}

function checkNoLocalhostValues(actualEnvVars) {
  const offenders = (actualEnvVars || []).filter((v) => /localhost|127\.0\.0\.1/i.test(v.value || ''));
  if (offenders.length === 0) {
    return { status: 'pass', message: 'No environment variable values point at localhost.' };
  }
  return {
    status: 'fail',
    message: `These variables still point at localhost: ${offenders.map((v) => v.key).join(', ')}.`,
  };
}

async function checkRegistration(backendUrl, testPlan, testEmail, testPassword) {
  const cfg = testPlan && testPlan.registration;
  if (!cfg || !cfg.enabled || !cfg.path) {
    return { status: 'skipped', message: 'Registration check disabled or no endpoint was found.' };
  }
  try {
    const body = buildTestBody(cfg.fields, testEmail, testPassword);
    const res = await fetchWithTimeout(`${trimTrailingSlash(backendUrl)}${cfg.path}`, {
      method: cfg.method || 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status >= 200 && res.status < 300) {
      return { status: 'pass', message: `Registration succeeded (HTTP ${res.status}).` };
    }
    const text = await res.text().catch(() => '');
    return { status: 'fail', message: `Registration failed (HTTP ${res.status}): ${text.slice(0, 200)}` };
  } catch (err) {
    return { status: 'fail', message: `Registration request failed: ${err.message}` };
  }
}

async function checkLogin(backendUrl, testPlan, testEmail, testPassword) {
  const cfg = testPlan && testPlan.login;
  if (!cfg || !cfg.enabled || !cfg.path) {
    return { status: 'skipped', message: 'Login check disabled or no endpoint was found.', token: null, cookie: null };
  }
  try {
    const body = buildTestBody(cfg.fields, testEmail, testPassword);
    const res = await fetchWithTimeout(`${trimTrailingSlash(backendUrl)}${cfg.path}`, {
      method: cfg.method || 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status < 200 || res.status >= 300) {
      const text = await res.text().catch(() => '');
      return { status: 'fail', message: `Login failed (HTTP ${res.status}): ${text.slice(0, 200)}`, token: null, cookie: null };
    }

    const cookie = res.headers.get('set-cookie');
    let token = null;
    if (cfg.tokenField) {
      try {
        const json = await res.json();
        token = getNestedField(json, cfg.tokenField) || null;
      } catch (err) {
        // response wasn't JSON or didn't have the expected field - fine if a cookie was set instead
      }
    }
    return { status: 'pass', message: 'Login succeeded.', token, cookie };
  } catch (err) {
    return { status: 'fail', message: `Login request failed: ${err.message}`, token: null, cookie: null };
  }
}

function checkAuthTokenOrCookie(testPlan, loginResult) {
  const cfg = testPlan && testPlan.login;
  if (!cfg || !cfg.enabled) {
    return { status: 'skipped', message: 'Login check disabled - nothing to verify.' };
  }
  if (!loginResult || loginResult.status !== 'pass') {
    return { status: 'skipped', message: 'Login did not succeed, so there is no token/cookie to check.' };
  }
  if (loginResult.token) {
    return { status: 'pass', message: 'A token was returned in the login response body.' };
  }
  if (loginResult.cookie) {
    return { status: 'pass', message: 'A Set-Cookie header was returned on login.' };
  }
  return { status: 'fail', message: 'Login succeeded but no token or authentication cookie was found in the response.' };
}

async function checkProtectedRoute(backendUrl, testPlan, loginResult) {
  const cfg = testPlan && testPlan.protectedRoute;
  if (!cfg || !cfg.enabled || !cfg.path) {
    return { status: 'skipped', message: 'Protected route check disabled or no endpoint was found.' };
  }
  if (!loginResult || (!loginResult.token && !loginResult.cookie)) {
    return { status: 'skipped', message: 'No auth token/cookie available to test the protected route with.' };
  }

  const headers = {};
  if (cfg.authMethod === 'cookie' && loginResult.cookie) {
    headers.Cookie = loginResult.cookie;
  } else if (loginResult.token) {
    headers.Authorization = `Bearer ${loginResult.token}`;
  } else if (loginResult.cookie) {
    headers.Cookie = loginResult.cookie;
  }

  try {
    const res = await fetchWithTimeout(`${trimTrailingSlash(backendUrl)}${cfg.path}`, {
      method: cfg.method || 'GET',
      headers,
    });
    if (res.status >= 200 && res.status < 300) {
      return { status: 'pass', message: `Protected route accessible with auth credentials (HTTP ${res.status}).` };
    }
    return { status: 'fail', message: `Protected route returned HTTP ${res.status} even with auth credentials attached.` };
  } catch (err) {
    return { status: 'fail', message: `Protected route request failed: ${err.message}` };
  }
}

async function attemptTestAccountCleanup(backendUrl, testPlan, loginResult) {
  const cfg = testPlan && testPlan.deleteAccount;
  if (!cfg || !cfg.enabled || !cfg.path) {
    return {
      attempted: false,
      cleanedUp: false,
      message: 'No delete-account endpoint was discovered - the test account could not be automatically removed.',
    };
  }
  if (!loginResult || (!loginResult.token && !loginResult.cookie)) {
    return { attempted: false, cleanedUp: false, message: 'No auth credentials available to remove the test account with.' };
  }

  const headers = {};
  if (cfg.authMethod === 'cookie' && loginResult.cookie) headers.Cookie = loginResult.cookie;
  else if (loginResult.token) headers.Authorization = `Bearer ${loginResult.token}`;
  else if (loginResult.cookie) headers.Cookie = loginResult.cookie;

  try {
    const res = await fetchWithTimeout(`${trimTrailingSlash(backendUrl)}${cfg.path}`, {
      method: cfg.method || 'DELETE',
      headers,
    });
    if (res.status >= 200 && res.status < 300) {
      return { attempted: true, cleanedUp: true, message: 'Test account was removed successfully.' };
    }
    return { attempted: true, cleanedUp: false, message: `Cleanup request returned HTTP ${res.status} - the test account may still exist.` };
  } catch (err) {
    return { attempted: true, cleanedUp: false, message: `Cleanup request failed: ${err.message}` };
  }
}

module.exports = {
  generateTestEmail,
  checkReachable,
  checkHttps,
  checkHealthEndpoint,
  checkCors,
  checkEnvVarsPresent,
  checkNoLocalhostValues,
  checkRegistration,
  checkLogin,
  checkAuthTokenOrCookie,
  checkProtectedRoute,
  attemptTestAccountCleanup,
};
