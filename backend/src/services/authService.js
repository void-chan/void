/**
 * src/services/authService.js
 *
 * Authentication business logic — separated from route/controller layers.
 *
 * WHY service layer:
 *  - Controllers stay thin (HTTP concerns only)
 *  - Business logic is independently testable
 *  - Easy to swap password hashing algorithm or token strategy later
 *
 * Password strategy: bcryptjs
 *  - WHY bcrypt: adaptive cost factor prevents brute-force as hardware improves
 *  - WHY NOT argon2: requires native compilation which complicates setup on Windows
 *  - Cost factor of 12 is the current minimum recommendation (OWASP 2024)
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getDatabase } from '../config/database.js';
import { env } from '../config/env.js';

// ── Token helpers ────────────────────────────────────────────────────────────

function generateAccessToken(user) {
  return jwt.sign(
    {
      sub:   user.id,
      email: user.email,
      role:  user.role,
    },
    env.jwt.secret,
    {
      expiresIn: env.jwt.expiresIn,
      // issuer and audience add extra validation surface
      issuer:   'localhost',
      audience: 'localhost-client',
    }
  );
}

function generateRefreshToken() {
  // Cryptographically random 64-byte token
  return crypto.randomBytes(64).toString('hex');
}

function hashToken(token) {
  // Store only the hash — raw refresh token is like a password
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ── Cookie configuration ─────────────────────────────────────────────────────

export function accessTokenCookieOptions() {
  return {
    httpOnly:  true,               // Inaccessible to JS
    secure:    env.cookie.secure,  // HTTPS only in production
    sameSite:  env.cookie.sameSite,
    maxAge:    15 * 60 * 1000,     // 15 minutes in ms
    path:      '/',
  };
}

export function refreshTokenCookieOptions() {
  return {
    httpOnly:  true,
    secure:    env.cookie.secure,
    sameSite:  env.cookie.sameSite,
    maxAge:    7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path:      '/api/auth/refresh',      // Scoped path → only sent to refresh endpoint
  };
}

// ── Service methods ──────────────────────────────────────────────────────────

export async function registerUser({ email, password }) {
  const db = getDatabase();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    const error = new Error('An account with this email already exists.');
    error.statusCode = 409;
    throw error;
  }

  const hash = await bcrypt.hash(password, env.bcrypt.rounds);

  const result = db
    .prepare('INSERT INTO users (email, password) VALUES (?, ?)')
    .run(email.toLowerCase(), hash);

  return { id: result.lastInsertRowid, email: email.toLowerCase(), role: 'user' };
}

export async function loginUser({ email, password }) {
  const db = getDatabase();

  // WHY constant-time comparison: prevents timing attacks that reveal if email exists
  const user = db
    .prepare('SELECT id, email, password, role, is_active FROM users WHERE email = ?')
    .get(email.toLowerCase());

  const dummyHash = '$2a$12$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
  const isValid = await bcrypt.compare(password, user?.password ?? dummyHash);

  if (!user || !isValid || !user.is_active) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  const accessToken   = generateAccessToken(user);
  const refreshToken  = generateRefreshToken();
  const tokenHash     = hashToken(refreshToken);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
  ).run(user.id, tokenHash, expiresAt);

  return {
    user:         { id: user.id, email: user.email, role: user.role },
    accessToken,
    refreshToken,
  };
}

export function refreshAccessToken(rawRefreshToken) {
  const db = getDatabase();
  const tokenHash = hashToken(rawRefreshToken);

  const stored = db
    .prepare(
      `SELECT rt.user_id, rt.expires_at, u.email, u.role, u.is_active
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = ?`
    )
    .get(tokenHash);

  if (!stored || !stored.is_active) {
    const error = new Error('Invalid refresh token.');
    error.statusCode = 401;
    throw error;
  }

  if (new Date(stored.expires_at) < new Date()) {
    db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(tokenHash);
    const error = new Error('Refresh token expired. Please log in again.');
    error.statusCode = 401;
    throw error;
  }

  const newAccessToken = generateAccessToken({
    id:    stored.user_id,
    email: stored.email,
    role:  stored.role,
  });

  return { accessToken: newAccessToken };
}

export function logoutUser(rawRefreshToken) {
  const db = getDatabase();
  if (!rawRefreshToken) return;
  const tokenHash = hashToken(rawRefreshToken);
  db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(tokenHash);
}

export function logoutAllDevices(userId) {
  const db = getDatabase();
  db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);
}
