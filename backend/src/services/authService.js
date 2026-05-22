/**
 * src/services/authService.js
 *
 * Anonymous authentication — username + password + 12-word recovery phrase.
 * No email, no verification, no personal data stored.
 *
 * Security model:
 *  - Passwords: bcrypt cost 12 (OWASP minimum 2024)
 *  - Recovery phrase: 12 BIP-39 words chosen via crypto.randomInt — 132 bits entropy
 *  - Recovery hash: prehash(SHA-256) → bcrypt — slow KDF prevents offline brute-force
 *  - JWTs: short-lived access tokens (15m) + long-lived refresh tokens (7d)
 *  - Refresh tokens: stored as SHA-256 hashes only
 *  - Anti-spam: PoW challenge required at registration (atomic, race-safe)
 */

import bcrypt   from 'bcryptjs';
import jwt      from 'jsonwebtoken';
import crypto   from 'crypto';
import { getDatabase } from '../config/database.js';
import { env }         from '../config/env.js';
import { WORDLIST }    from '../utils/wordlist.js';

// ── Token helpers ─────────────────────────────────────────────────────────────

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn, issuer: env.jwt.issuer, audience: env.jwt.audience }
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ── Cookie options ────────────────────────────────────────────────────────────

export function accessTokenCookieOptions() {
  return {
    httpOnly: true,
    secure:   env.cookie.secure,
    sameSite: env.cookie.sameSite,
    maxAge:   15 * 60 * 1000,
    path:     '/',
  };
}

export function refreshTokenCookieOptions() {
  return {
    httpOnly: true,
    secure:   env.cookie.secure,
    sameSite: env.cookie.sameSite,
    maxAge:   7 * 24 * 60 * 60 * 1000,
    path:     '/api/auth/refresh',
  };
}

// ── Recovery phrase ───────────────────────────────────────────────────────────

function generateRecoveryPhrase() {
  // 12 words chosen from BIP-39 list using crypto.randomInt (uniform, unbiased)
  const words = [];
  for (let i = 0; i < 12; i++) {
    words.push(WORDLIST[crypto.randomInt(0, WORDLIST.length)]);
  }
  return words.join(' ');
}

/**
 * Normalise and pre-hash a recovery phrase.
 * WHY pre-hash: bcrypt has a 72-byte input limit. A 12-word phrase can exceed
 * that (~107 bytes max). SHA-256 pre-hash produces a fixed 64-char hex string
 * which fits within bcrypt's limit. This is the Dropbox prehash-then-bcrypt pattern.
 */
function preHashPhrase(phrase) {
  const normalised = phrase.toLowerCase().trim().replace(/\s+/g, ' ');
  return crypto.createHash('sha256').update(normalised).digest('hex');
}

/**
 * Hash a recovery phrase for storage using bcrypt (slow KDF).
 * [AUDIT FIX C1] Previously used naked SHA-256 — vulnerable to GPU brute-force
 * if attacker has partial phrase knowledge + DB dump.
 */
export async function hashPhraseForStorage(phrase) {
  const preHash = preHashPhrase(phrase);
  return bcrypt.hash(preHash, env.bcrypt.rounds);
}

/**
 * Verify a recovery phrase against a stored bcrypt hash.
 * bcrypt.compare is inherently constant-time.
 */
export async function verifyPhrase(phrase, storedHash) {
  const preHash = preHashPhrase(phrase);
  return bcrypt.compare(preHash, storedHash);
}

// ── PoW helpers ───────────────────────────────────────────────────────────────

export function createChallenge() {
  const db = getDatabase();

  // Purge stale challenges older than 10 minutes first
  db.prepare(
    `DELETE FROM pow_challenges WHERE created_at < datetime('now','-10 minutes')`
  ).run();

  const id = crypto.randomBytes(16).toString('hex');

  // [AUDIT FIX M1] Adaptive difficulty — scales up under high registration rate
  const baseD = parseInt(process.env.POW_DIFFICULTY ?? '4', 10);
  const recentCount = db.prepare(
    `SELECT COUNT(*) as c FROM pow_challenges WHERE created_at > datetime('now','-5 minutes')`
  ).get().c;
  const difficulty = Math.min(6, baseD + Math.floor(recentCount / 10));

  db.prepare('INSERT INTO pow_challenges (id, difficulty) VALUES (?, ?)').run(id, difficulty);

  return { challenge: id, difficulty };
}

/**
 * [AUDIT FIX C3] Atomic challenge consumption — single UPDATE WHERE used=0.
 * Eliminates the TOCTOU race condition where concurrent requests could reuse
 * the same solved challenge to create multiple accounts.
 */
export function verifyChallenge(challengeId, nonce) {
  const db = getDatabase();

  // Step 1: Read difficulty (needed for hash verification)
  const row = db.prepare(
    `SELECT difficulty FROM pow_challenges
     WHERE id = ? AND used = 0
     AND created_at > datetime('now','-10 minutes')`
  ).get(challengeId);

  if (!row) {
    throw Object.assign(
      new Error('Challenge not found, expired, or already used.'),
      { statusCode: 400, expose: true }
    );
  }

  // Step 2: Verify SHA-256(challenge + nonce) starts with `difficulty` zero hex chars
  const hash = crypto.createHash('sha256').update(challengeId + String(nonce)).digest('hex');
  const target = '0'.repeat(row.difficulty);

  if (!hash.startsWith(target)) {
    throw Object.assign(
      new Error('Invalid proof-of-work solution.'),
      { statusCode: 400, expose: true }
    );
  }

  // Step 3: Atomically mark as used — if another request already consumed it, changes === 0
  const result = db.prepare(
    `UPDATE pow_challenges SET used = 1 WHERE id = ? AND used = 0`
  ).run(challengeId);

  if (result.changes === 0) {
    throw Object.assign(
      new Error('Challenge already consumed by another request.'),
      { statusCode: 409, expose: true }
    );
  }

  return true;
}

// ── Service methods ───────────────────────────────────────────────────────────

export async function registerUser({ username, password, challenge, nonce }) {
  const db = getDatabase();

  // 1. Verify PoW (anti-spam) — atomic, race-safe
  verifyChallenge(challenge, nonce);

  // 2. Check username availability (case-insensitive)
  const existing = db.prepare(
    'SELECT id FROM users WHERE username = ? COLLATE NOCASE'
  ).get(username);
  if (existing) {
    throw Object.assign(
      new Error('Username already taken. Choose another.'),
      { statusCode: 409, expose: true }
    );
  }

  // 3. Hash password
  const passwordHash = await bcrypt.hash(password, env.bcrypt.rounds);

  // 4. Generate 12-word recovery phrase and hash it with bcrypt [AUDIT FIX C1]
  const recoveryPhrase = generateRecoveryPhrase();
  const recoveryHash   = await hashPhraseForStorage(recoveryPhrase);

  // 5. [AUDIT FIX M3] Ensure recovery_hash is never NULL
  if (!recoveryHash) {
    throw new Error('Failed to generate recovery hash — aborting registration.');
  }

  // 6. Insert user
  const result = db.prepare(
    `INSERT INTO users (username, password, recovery_hash, role)
     VALUES (?, ?, ?, 'user')`
  ).run(username.toLowerCase(), passwordHash, recoveryHash);

  return {
    user: { id: result.lastInsertRowid, username: username.toLowerCase(), role: 'user' },
    recoveryPhrase,   // Returned ONCE — never stored in plaintext
  };
}

export async function loginUser({ username, password, adminPhrase }) {
  const db = getDatabase();

  const user = db.prepare(
    'SELECT id, username, password, role, is_active, admin_phrase_hash FROM users WHERE username = ? COLLATE NOCASE'
  ).get(username);

  // Constant-time comparison even when user not found (prevent timing attacks)
  const dummyHash = '$2a$12$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
  const isValid   = await bcrypt.compare(password, user?.password ?? dummyHash);

  if (!user || !isValid || !user.is_active) {
    throw Object.assign(
      new Error('Invalid username or password.'),
      { statusCode: 401, expose: true }
    );
  }

  // ── Admin second-factor: phrase check ─────────────────────────────────────
  if (user.role === 'admin') {
    // Always run bcrypt compare to prevent timing-based detection
    const phraseToCheck  = adminPhrase ?? '';
    const hashToCheck    = user.admin_phrase_hash ?? dummyHash;
    const phraseValid    = await bcrypt.compare(phraseToCheck, hashToCheck);

    if (!user.admin_phrase_hash || !phraseValid) {
      // Same generic message — attacker cannot distinguish missing phrase from wrong phrase
      throw Object.assign(
        new Error('Invalid username or password.'),
        { statusCode: 401, expose: true }
      );
    }
  }

  const accessToken  = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  const tokenHash    = hashToken(refreshToken);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
  ).run(user.id, tokenHash, expiresAt);

  return {
    user:         { id: user.id, username: user.username, role: user.role },
    accessToken,
    refreshToken,
  };
}

export function refreshAccessToken(rawRefreshToken) {
  const db        = getDatabase();
  const tokenHash = hashToken(rawRefreshToken);

  const stored = db.prepare(
    `SELECT rt.user_id, rt.expires_at, u.username, u.role, u.is_active
     FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = ?`
  ).get(tokenHash);

  if (!stored || !stored.is_active) {
    throw Object.assign(new Error('Invalid refresh token.'), { statusCode: 401, expose: true });
  }
  if (new Date(stored.expires_at) < new Date()) {
    db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(tokenHash);
    throw Object.assign(new Error('Refresh token expired. Please log in again.'), { statusCode: 401, expose: true });
  }

  const newAccessToken = generateAccessToken({
    id:       stored.user_id,
    username: stored.username,
    role:     stored.role,
  });
  return { accessToken: newAccessToken };
}

/**
 * [AUDIT FIX C1] Recovery now uses bcrypt.compare for phrase verification
 * instead of SHA-256 + timingSafeEqual. bcrypt.compare is inherently
 * constant-time and resistant to GPU brute-force.
 *
 * [AUDIT FIX M3] Guards against NULL recovery_hash.
 */
export async function recoverAccount({ username, recoveryPhrase, newPassword }) {
  const db = getDatabase();

  const user = db.prepare(
    'SELECT id, recovery_hash FROM users WHERE username = ? COLLATE NOCASE'
  ).get(username);

  // Guard: if user not found OR recovery_hash is NULL, still run bcrypt to prevent timing leak
  const dummyHash = '$2a$12$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
  const hashToVerify = (user?.recovery_hash) || dummyHash;

  const match = await verifyPhrase(recoveryPhrase, hashToVerify);

  if (!user || !user.recovery_hash || !match) {
    throw Object.assign(
      new Error('Invalid username or recovery phrase.'),
      { statusCode: 401, expose: true }
    );
  }

  const newHash = await bcrypt.hash(newPassword, env.bcrypt.rounds);

  // Rotate recovery phrase on successful recovery (invalidates old phrase)
  const newPhrase       = generateRecoveryPhrase();
  const newRecoveryHash = await hashPhraseForStorage(newPhrase);

  db.prepare(
    'UPDATE users SET password = ?, recovery_hash = ? WHERE id = ?'
  ).run(newHash, newRecoveryHash, user.id);

  // Invalidate all existing sessions
  db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(user.id);

  return { newRecoveryPhrase: newPhrase, userId: user.id };
}

export function logoutUser(rawRefreshToken) {
  const db = getDatabase();
  if (!rawRefreshToken) return;
  db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(hashToken(rawRefreshToken));
}

export function logoutAllDevices(userId) {
  getDatabase().prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);
}

/**
 * [AUDIT FIX M4] Password change — MUST invalidate all sessions.
 * If this function is ever called without deleting refresh tokens,
 * old sessions remain valid despite the password change.
 * Use this function instead of writing a raw UPDATE.
 */
export async function changePassword(userId, newPassword) {
  const db = getDatabase();
  const hash = await bcrypt.hash(newPassword, env.bcrypt.rounds);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, userId);
  // CRITICAL: Invalidate ALL sessions after password change
  db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);
}

// ── Maintenance ───────────────────────────────────────────────────────────────

/**
 * [AUDIT FIX M2] Purge expired refresh tokens and stale PoW challenges.
 * Called periodically from server.js.
 */
export function cleanupExpiredTokens() {
  const db = getDatabase();
  const tokens = db.prepare(`DELETE FROM refresh_tokens WHERE expires_at < datetime('now')`).run();
  const pows   = db.prepare(`DELETE FROM pow_challenges WHERE created_at < datetime('now','-10 minutes')`).run();
  return { tokensRemoved: tokens.changes, challengesRemoved: pows.changes };
}
