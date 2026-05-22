/**
 * src/config/env.js
 *
 * Central environment configuration with validation at startup.
 * WHY: Fail fast if required vars are missing — no silent misconfigurations.
 */

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from backend root
config({ path: path.resolve(__dirname, '../../.env') });

function require(key, fallback) {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function requireSecret(key) {
  const value = process.env[key];
  if (!value || value.length < 32) {
    throw new Error(
      `Environment variable "${key}" must be set and at least 32 characters long.`
    );
  }
  return value;
}

// ── Production safety: reject known weak dev secrets ──────────────────────
const KNOWN_WEAK_PREFIXES = [
  'dev_jwt_secret',
  'dev_refresh_secret',
  'CHANGE_THIS',
];

function rejectWeakSecrets() {
  if ((process.env.NODE_ENV ?? 'development') !== 'production') return;

  for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
    const val = process.env[key] ?? '';
    for (const prefix of KNOWN_WEAK_PREFIXES) {
      if (val.startsWith(prefix)) {
        throw new Error(
          `FATAL: "${key}" contains a known dev/placeholder secret. ` +
          `Generate a real one: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
        );
      }
    }
  }

  // Cookies MUST be secure in production (HTTPS required)
  if (process.env.COOKIE_SECURE !== 'true') {
    throw new Error(
      'FATAL: COOKIE_SECURE must be "true" in production. ' +
      'Auth cookies sent over HTTP can be intercepted (MITM).'
    );
  }
}

export const env = {
  port: parseInt(require('PORT', '4000'), 10),
  host: require('HOST', 'localhost'),
  nodeEnv: require('NODE_ENV', 'development'),
  isDev: (process.env.NODE_ENV ?? 'development') === 'development',

  db: {
    // In production (Railway): /data is the persistent volume mount point
    // In development: local ./storage folder
    path: require('DB_PATH', process.env.NODE_ENV === 'production' ? '/data/database.sqlite' : './storage/database.sqlite'),
  },

  jwt: {
    secret: requireSecret('JWT_SECRET'),
    expiresIn: require('JWT_EXPIRES_IN', '15m'),
    refreshSecret: requireSecret('JWT_REFRESH_SECRET'),
    refreshExpiresIn: require('JWT_REFRESH_EXPIRES_IN', '7d'),
    issuer: require('JWT_ISSUER', 'localhost'),
    audience: require('JWT_AUDIENCE', 'localhost-client'),
  },

  cookie: {
    secure: require('COOKIE_SECURE', 'false') === 'true',
    sameSite: require('COOKIE_SAME_SITE', 'strict'),
  },

  cors: {
    origin: require('CORS_ORIGIN', 'http://localhost:5173'),
  },

  upload: {
    maxSizeMb: parseInt(require('UPLOAD_MAX_SIZE_MB', '10'), 10),
    dir: require('UPLOAD_DIR', './storage/uploads'),
  },

  rateLimit: {
    windowMs: parseInt(require('RATE_LIMIT_WINDOW_MS', '900000'), 10),
    max: parseInt(require('RATE_LIMIT_MAX', '100'), 10),
    authMax: parseInt(require('AUTH_RATE_LIMIT_MAX', '10'), 10),
  },

  bcrypt: {
    rounds: parseInt(require('BCRYPT_ROUNDS', '12'), 10),
  },
};

// Run production safety check after env is loaded
rejectWeakSecrets();
