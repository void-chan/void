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

export const env = {
  port: parseInt(require('PORT', '4000'), 10),
  host: require('HOST', 'localhost'),
  nodeEnv: require('NODE_ENV', 'development'),
  isDev: (process.env.NODE_ENV ?? 'development') === 'development',

  db: {
    path: require('DB_PATH', './storage/database.sqlite'),
  },

  jwt: {
    secret: requireSecret('JWT_SECRET'),
    expiresIn: require('JWT_EXPIRES_IN', '15m'),
    refreshSecret: requireSecret('JWT_REFRESH_SECRET'),
    refreshExpiresIn: require('JWT_REFRESH_EXPIRES_IN', '7d'),
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
