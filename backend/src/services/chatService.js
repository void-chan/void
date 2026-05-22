/**
 * src/services/chatService.js
 *
 * Anonymous public chat — no account required.
 * The chat room hard-resets every RESET_INTERVAL_MS (1 hour by default).
 * On reset, ALL messages are deleted and the clock restarts.
 */

import { getDatabase } from '../config/database.js';
import { detectSpam }  from './spamDetector.js';

const RESET_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const PAGE_SIZE = 100; // Messages returned per fetch

// ── Reset logic ──────────────────────────────────────────────────────────────

function getLastReset(db) {
  const row = db.prepare("SELECT value FROM system_settings WHERE key='chat_last_reset'").get();
  return row ? new Date(row.value).getTime() : Date.now();
}

function setLastReset(db, ts) {
  db.prepare(
    "INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('chat_last_reset', ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))"
  ).run(new Date(ts).toISOString());
}

/**
 * Check if it's time to reset the chat room.
 * If so, wipes all messages and updates the clock.
 * Returns { reset: bool, nextResetAt: ISO string }
 */
function maybeResetChat(db) {
  const lastReset = getLastReset(db);
  const now       = Date.now();
  const elapsed   = now - lastReset;

  if (elapsed >= RESET_INTERVAL_MS) {
    db.exec('DELETE FROM anon_messages');
    setLastReset(db, now);
    return { reset: true, nextResetAt: new Date(now + RESET_INTERVAL_MS).toISOString() };
  }

  return { reset: false, nextResetAt: new Date(lastReset + RESET_INTERVAL_MS).toISOString() };
}

// ── Public API ───────────────────────────────────────────────────────────────

export function getChatState() {
  const db = getDatabase();
  const { reset, nextResetAt } = maybeResetChat(db);

  const messages = db
    .prepare(
      `SELECT id, anon_handle, content, created_at, user_handle, user_role
       FROM anon_messages
       WHERE is_flagged = 0
       ORDER BY created_at ASC
       LIMIT ?`
    )
    .all(PAGE_SIZE);

  const lastReset = getLastReset(db);

  return {
    messages,
    nextResetAt,
    lastResetAt: new Date(lastReset).toISOString(),
    wasJustReset: reset,
  };
}

export function postMessage(anonId, anonHandle, content, userHandle = null, userRole = null) {
  const db = getDatabase();

  // Always check for a reset first
  maybeResetChat(db);

  // Spam detection
  const spamResult = detectSpam(content, anonId);
  if (spamResult.spam) {
    const err = new Error(spamResult.reason);
    err.statusCode = 429;
    err.isSpam = true;
    throw err;
  }

  const sanitized = content.trim().slice(0, 2000);

  const result = db
    .prepare(
      `INSERT INTO anon_messages (anon_id, anon_handle, content, user_handle, user_role)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(anonId, anonHandle, sanitized, userHandle, userRole);

  return db
    .prepare(
      'SELECT id, anon_handle, content, created_at, user_handle, user_role FROM anon_messages WHERE id = ?'
    )
    .get(result.lastInsertRowid);
}

export function getChatTimings() {
  const db = getDatabase();
  const lastReset = getLastReset(db);
  const nextResetAt = new Date(lastReset + RESET_INTERVAL_MS).toISOString();
  return { lastResetAt: new Date(lastReset).toISOString(), nextResetAt };
}
