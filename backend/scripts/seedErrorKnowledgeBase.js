/**
 * One-off seed script for the Deployment Troubleshooting Agent's error
 * knowledge base. Embeds a curated list of common deployment error patterns
 * + fixes and upserts them into the same Chroma collection the rest of
 * CloudPilot's knowledge base uses, tagged with metadata.category =
 * 'error_pattern' so errorKnowledgeService can retrieve only these.
 *
 * Run manually: node backend/scripts/seedErrorKnowledgeBase.js
 * Not wired into app startup - re-running is safe (upsert is idempotent on id).
 */
require('dotenv').config();
const crypto = require('crypto');
const { getEmbeddings } = require('../services/embeddingService');
const { upsertChunks } = require('../services/chromaService');

const ERROR_PATTERNS = [
  {
    errorType: 'MODULE_NOT_FOUND',
    description: "Node.js fails with \"Error: Cannot find module 'X'\" or \"MODULE_NOT_FOUND\" during startup or build.",
    fix: 'The dependency is missing from package.json (often added locally but never saved), or the build step never ran `npm install`. Add the missing package to dependencies (not just devDependencies if it is needed at runtime) and ensure the platform build command runs `npm install` before `npm start`.',
  },
  {
    errorType: 'npm_install_failure',
    description: '`npm ERR!` during the install/build step, often with a peer dependency conflict or an engine version mismatch (ERESOLVE, EBADENGINE).',
    fix: 'Pin a compatible Node version via an "engines" field in package.json or a platform Node-version setting, and resolve the conflicting peer dependency version, or add `--legacy-peer-deps` to the install command as a last resort.',
  },
  {
    errorType: 'wrong_start_command',
    description: 'The build succeeds but the service immediately exits or never becomes healthy, with logs showing "Cannot find module" for the entry file, or no output at all after build.',
    fix: 'The configured start command points at the wrong entry file or working directory (e.g. running from repo root when the app lives in a subfolder like backend/). Correct the start command and/or root directory to match the actual project layout.',
  },
  {
    errorType: 'port_binding_mismatch',
    description: 'Deploy succeeds but the service is reported unhealthy / times out; logs show the app listening on a hardcoded port (e.g. 3000) that does not match the platform-assigned port.',
    fix: 'Bind to `process.env.PORT` (Render/most PaaS providers inject this) instead of a hardcoded port number, falling back to a local default only when PORT is unset.',
  },
  {
    errorType: 'missing_env_var',
    description: 'App crashes on startup with an error referencing an undefined environment variable, or a config library throws "required env var X is missing".',
    fix: 'Add the missing environment variable to the platform service\'s environment variable settings. Cross-check against the repo\'s .env.example for the exact key name and expected format.',
  },
  {
    errorType: 'db_connection_refused',
    description: 'Startup logs show ECONNREFUSED or a database connection timeout when connecting to Postgres/Mongo/MySQL.',
    fix: 'The database connection string env var is missing, still points at localhost/a local dev DB, or the database service is not yet ready. Verify the connection string points at the actual managed database host and that the DB service is running.',
  },
  {
    errorType: 'cors_blocked',
    description: 'Frontend requests to the backend fail in the browser console with a CORS policy error, even though the backend itself is reachable.',
    fix: 'Set the backend\'s CORS allowed-origin environment variable (or hardcoded config) to the frontend\'s actual deployed URL rather than localhost or a wildcard that the framework rejects for credentialed requests.',
  },
  {
    errorType: 'hardcoded_localhost_url',
    description: 'The deployed frontend cannot reach the backend; network requests go to http://localhost:PORT instead of the live backend URL.',
    fix: 'Replace the hardcoded localhost API base URL with an environment variable (e.g. VITE_API_URL / REACT_APP_API_URL) set to the backend\'s live deployed URL, and rebuild/redeploy the frontend.',
  },
  {
    errorType: 'build_exit_code_1',
    description: 'Build step fails with a generic non-zero exit code and a compiler/bundler error above it (webpack, vite, tsc, babel).',
    fix: 'Read the specific compiler error immediately preceding the exit code - it is almost always a real syntax/type error, a missing import, or an incompatible dependency version introduced in a recent commit.',
  },
  {
    errorType: 'native_module_build_failure',
    description: 'Build fails while compiling a native Node addon (node-gyp, bcrypt, sharp, sqlite3) with errors about missing build tools or headers.',
    fix: 'Use a prebuilt/pure-JS alternative if available (e.g. bcryptjs instead of bcrypt), or ensure the platform\'s build image has the required native build toolchain; pin the package to a version with prebuilt binaries for the deploy target OS.',
  },
  {
    errorType: 'python_module_not_found',
    description: 'Python app fails with "ModuleNotFoundError: No module named X" at startup.',
    fix: 'The package is missing from requirements.txt or pyproject.toml, or the build step did not run `pip install -r requirements.txt`. Add the dependency and confirm the install command runs before the start command.',
  },
  {
    errorType: 'python_wrong_entrypoint',
    description: 'Python/Flask/Django app build succeeds but the start command fails with "No module named app" or similar import errors.',
    fix: 'The start command (e.g. gunicorn) references the wrong module path for the WSGI/ASGI app object. Correct it to match the actual file/module structure (e.g. `gunicorn app:app` vs `gunicorn src.main:app`).',
  },
  {
    errorType: 'docker_build_context_missing_file',
    description: 'Docker build fails with "COPY failed: file not found" or similar.',
    fix: 'The Dockerfile references a path that does not exist relative to the build context, often because the build context/root directory is misconfigured on the platform, or the file is excluded by .dockerignore.',
  },
  {
    errorType: 'render_build_command_missing',
    description: 'Render service deploy fails immediately with no build output, or runs the wrong commands.',
    fix: 'Verify the Render service\'s Build Command and Start Command are set correctly for the detected framework, and that the Root Directory matches where package.json/requirements.txt actually lives in a monorepo.',
  },
  {
    errorType: 'vercel_function_size_limit',
    description: 'Vercel deployment fails or a serverless function crashes with a size/payload limit error.',
    fix: 'Reduce the deployed bundle size (remove unused dependencies, use dynamic imports, exclude large assets from the function bundle) or split the function into smaller ones.',
  },
  {
    errorType: 'out_of_memory',
    description: 'Build or runtime process is killed with an out-of-memory error (JavaScript heap out of memory, OOM killed).',
    fix: 'Increase the platform\'s instance/plan memory if possible, reduce memory usage during build (e.g. limit Node\'s `--max-old-space-size` appropriately), or fix a memory leak/unbounded cache in the app code.',
  },
  {
    errorType: 'health_check_failed',
    description: 'Platform reports the deploy as failed because the health check endpoint never returned a successful response within the timeout.',
    fix: 'Confirm the health check path actually exists and returns 200 quickly, and that the app finishes initializing (e.g. DB connection) before it starts listening, or increase the health check timeout if initialization is legitimately slow.',
  },
  {
    errorType: 'syntax_error',
    description: 'Runtime or build crashes with a JavaScript/TypeScript SyntaxError pointing at a specific file and line.',
    fix: 'Fix the actual syntax error at the referenced file/line - this is usually a real code defect, often from an incomplete merge or a copy-paste mistake, not a configuration issue.',
  },
  {
    errorType: 'undefined_is_not_a_function',
    description: 'Runtime crash with "X is not a function" or "Cannot read properties of undefined" shortly after a new deploy.',
    fix: 'A recently changed import, a renamed export, or a dependency version bump changed an API shape. Check the diff of the most recent commit(s) for the referenced file and correct the mismatched usage.',
  },
  {
    errorType: 'env_pointing_to_wrong_service',
    description: 'One deployed component works in isolation but frontend/backend integration is broken (wrong data, 404s, connection errors) even though both are individually reachable.',
    fix: 'An environment variable on one component (API base URL, callback URL, webhook URL) still points at a different environment (staging, localhost, or the wrong live URL). Update it to the other component\'s actual current live URL.',
  },
];

function chunkText(entry) {
  return `Error: ${entry.errorType}\n${entry.description}\n\nFix: ${entry.fix}`;
}

async function seed() {
  const texts = ERROR_PATTERNS.map(chunkText);
  console.log(`Embedding ${texts.length} error-pattern chunks...`);
  const embeddings = await getEmbeddings(texts);

  const ids = ERROR_PATTERNS.map((entry) => `error-kb-${crypto.createHash('md5').update(entry.errorType).digest('hex').slice(0, 12)}`);
  const metadatas = ERROR_PATTERNS.map((entry) => ({
    category: 'error_pattern',
    errorType: entry.errorType,
    sourceName: 'Error Knowledge Base',
  }));

  console.log('Upserting into Chroma...');
  await upsertChunks({ ids, embeddings, documents: texts, metadatas });
  console.log(`Seeded ${ids.length} error-pattern chunks.`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to seed error knowledge base:', err);
    process.exit(1);
  });
