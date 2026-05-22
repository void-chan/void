/**
 * src/services/spamDetector.js
 *
 * Multi-signal spam detection for anonymous chat.
 *
 * Signals checked (in order of cheapness):
 *  1. Length too short — pure noise
 *  2. Repeated single character — "aaaaaaaaa"
 *  3. Repetitive pattern — "lol lol lol lol"
 *  4. Excessive caps — "HEY LOOK AT THIS"
 *  5. Too many messages per minute (rate-based, per session)
 *  6. Duplicate of recent own message
 *  7. Very long message with high repetition ratio
 *
 * WHY plain text (no ML):
 *  - Runs fully local, no external API
 *  - Fast and deterministic
 *  - Easy to audit and tune thresholds
 */

import { getDatabase } from '../config/database.js';

// In-memory rate tracker: Map<anonId, [{timestamp}]>
const rateTracker = new Map();

// Clean up old entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [id, times] of rateTracker) {
    const fresh = times.filter((t) => t > cutoff);
    if (fresh.length === 0) rateTracker.delete(id);
    else rateTracker.set(id, fresh);
  }
}, 5 * 60_000);

// ── Thresholds ───────────────────────────────────────────────────────────────
const MIN_LENGTH     = 3;    // Minimum meaningful characters
const MAX_LENGTH     = 2000; // Maximum message length
const RATE_WINDOW    = 30_000; // 30 second window
const RATE_MAX       = 5;    // Max messages per 30s
const CAPS_THRESHOLD = 0.75; // 75%+ uppercase = shouting
const CAPS_MIN_LEN   = 15;   // Only flag caps if message is long enough
const REPEAT_RATIO   = 0.6;  // 60%+ repeated chars in sequence = suspicious

/**
 * Check message for spam signals.
 * @returns {{ spam: boolean, reason?: string }}
 */
export function detectSpam(content, anonId) {
  const msg = content.trim();

  // ── 1. Length check ────────────────────────────────────────────────
  if (msg.length < MIN_LENGTH) {
    return { spam: true, reason: 'Message too short. Minimum 3 characters.' };
  }

  if (msg.length > MAX_LENGTH) {
    return { spam: true, reason: `Message too long. Maximum ${MAX_LENGTH} characters.` };
  }

  // ── 2. Single repeated character  ─────────────────────────────────
  // e.g. "aaaaaaaaaa" or "!!!!!!!!!!!"
  if (/^(.)\1+$/.test(msg)) {
    return { spam: true, reason: 'Repeated character detected. Use normal text.' };
  }

  // ── 3. High repetitive pattern ─────────────────────────────────────
  // Detects "haha haha haha haha" or "lol lol lol"
  const repeatPatternMatch = msg.match(/(.{3,}?)\s*\1{3,}/);
  if (repeatPatternMatch) {
    return { spam: true, reason: 'Repetitive pattern detected. Use normal text.' };
  }

  // ── 4. All caps (shouting) ─────────────────────────────────────────
  if (msg.length >= CAPS_MIN_LEN) {
    const letters = msg.replace(/[^a-zA-Z]/g, '');
    if (letters.length > 0) {
      const capsRatio = (msg.replace(/[^A-Z]/g, '').length) / letters.length;
      if (capsRatio >= CAPS_THRESHOLD) {
        return { spam: true, reason: 'Excessive capitals. Use normal text.' };
      }
    }
  }

  // ── 5. Rate limiting per session ───────────────────────────────────
  const now = Date.now();
  const windowStart = now - RATE_WINDOW;

  let times = rateTracker.get(anonId) ?? [];
  times = times.filter((t) => t > windowStart);

  if (times.length >= RATE_MAX) {
    const waitSec = Math.ceil((times[0] + RATE_WINDOW - now) / 1000);
    return {
      spam: true,
      reason: `Rate limit. You are sending messages too fast. Wait ${waitSec}s.`,
    };
  }

  // ── 6. Duplicate of recent own message ─────────────────────────────
  try {
    const db = getDatabase();
    const recent = db
      .prepare(
        `SELECT content FROM anon_messages
         WHERE anon_id = ?
         AND created_at > datetime('now', '-2 minutes')
         ORDER BY created_at DESC
         LIMIT 5`
      )
      .all(anonId);

    const normalized = msg.toLowerCase().replace(/\s+/g, ' ');
    const isDuplicate = recent.some(
      (r) => r.content.toLowerCase().replace(/\s+/g, ' ') === normalized
    );

    if (isDuplicate) {
      return { spam: true, reason: 'Duplicate message. Do not repeat yourself.' };
    }
  } catch {
    // DB not available — skip this check
  }

  // ── 7. High repetition ratio in long messages ──────────────────────
  // Count unique chars vs total — very low unique ratio = spam
  if (msg.length > 50) {
    const unique = new Set(msg.toLowerCase().replace(/\s/g, '')).size;
    const total  = msg.replace(/\s/g, '').length;
    if (unique / total < (1 - REPEAT_RATIO)) {
      return { spam: true, reason: 'Message content is too repetitive. Use normal text.' };
    }
  }

  // ── Clean — record this send ────────────────────────────────────────
  times.push(now);
  rateTracker.set(anonId, times);

  return { spam: false };
}
