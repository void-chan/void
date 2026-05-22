/**
 * src/utils/migrate.js — Schema-as-code migration runner
 */

import { getDatabase } from '../config/database.js';

const migrations = [
  {
    version: 1,
    name: 'initial_schema',
    up: `
      CREATE TABLE IF NOT EXISTS users (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        email       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
        password    TEXT    NOT NULL,
        role        TEXT    NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
        is_active   INTEGER NOT NULL DEFAULT 1,
        created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );

      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash  TEXT    NOT NULL UNIQUE,
        expires_at  TEXT    NOT NULL,
        created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );

      CREATE TABLE IF NOT EXISTS uploads (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        original_name TEXT    NOT NULL,
        stored_name   TEXT    NOT NULL UNIQUE,
        mime_type     TEXT    NOT NULL,
        size_bytes    INTEGER NOT NULL,
        path          TEXT    NOT NULL,
        created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );

      CREATE INDEX IF NOT EXISTS idx_users_email         ON users(email);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_uploads_user        ON uploads(user_id);

      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    INTEGER PRIMARY KEY,
        name       TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
    `,
  },
  {
    version: 2,
    name: 'forum_schema',
    up: `
      -- ── Anonymous chat messages ─────────────────────────────────────
      -- Each message belongs to a browser session (anon_id cookie UUID).
      -- No user account required.
      CREATE TABLE IF NOT EXISTS anon_messages (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        anon_id     TEXT    NOT NULL,           -- client UUID cookie
        anon_handle TEXT    NOT NULL,           -- "ANON_XXXXXX" display name
        content     TEXT    NOT NULL,
        is_flagged  INTEGER NOT NULL DEFAULT 0, -- 1 = spam-flagged by system
        created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );

      CREATE INDEX IF NOT EXISTS idx_anon_messages_anon   ON anon_messages(anon_id);
      CREATE INDEX IF NOT EXISTS idx_anon_messages_time   ON anon_messages(created_at);

      -- ── Blog posts (admin only) ──────────────────────────────────────
      CREATE TABLE IF NOT EXISTS blog_posts (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        author_id   INTEGER NOT NULL REFERENCES users(id),
        title       TEXT    NOT NULL,
        slug        TEXT    NOT NULL UNIQUE,
        body        TEXT    NOT NULL,           -- Markdown or plain text
        is_published INTEGER NOT NULL DEFAULT 1,
        created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );

      CREATE INDEX IF NOT EXISTS idx_blog_posts_slug      ON blog_posts(slug);
      CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(is_published, created_at);

      -- ── Admin inbox (registered users → admin) ──────────────────────
      CREATE TABLE IF NOT EXISTS admin_inbox (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject     TEXT    NOT NULL,
        body        TEXT    NOT NULL,
        is_read     INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );

      CREATE INDEX IF NOT EXISTS idx_inbox_sender ON admin_inbox(sender_id);

      -- ── Inbox attachments ────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS inbox_attachments (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id    INTEGER NOT NULL REFERENCES admin_inbox(id) ON DELETE CASCADE,
        original_name TEXT    NOT NULL,
        stored_name   TEXT    NOT NULL UNIQUE,
        mime_type     TEXT    NOT NULL,
        size_bytes    INTEGER NOT NULL,
        path          TEXT    NOT NULL,
        created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );

      -- ── System settings (key-value store) ───────────────────────────
      -- Used to track chat reset timestamps, etc.
      CREATE TABLE IF NOT EXISTS system_settings (
        key         TEXT PRIMARY KEY,
        value       TEXT NOT NULL,
        updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );

      -- Initialize the chat reset clock
      INSERT OR IGNORE INTO system_settings (key, value)
      VALUES ('chat_last_reset', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
    `,
  },
  {
    version: 3,
    name: 'blog_wallet_and_image',
    up: `
      -- Add wallet + image support to blog posts
      ALTER TABLE blog_posts ADD COLUMN wallet_enabled  INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE blog_posts ADD COLUMN eth_address     TEXT;
      ALTER TABLE blog_posts ADD COLUMN btc_address     TEXT;
      ALTER TABLE blog_posts ADD COLUMN image_stored    TEXT;
      ALTER TABLE blog_posts ADD COLUMN image_original  TEXT;
      ALTER TABLE blog_posts ADD COLUMN image_mime      TEXT;
    `,
  },
  {
    version: 4,
    name: 'username_auth',
    up: `
      -- ── Convert email → username ────────────────────────────────────
      ALTER TABLE users RENAME COLUMN email TO username;
      ALTER TABLE users ADD COLUMN recovery_hash TEXT;

      -- Drop old email index, create username index
      DROP INDEX IF EXISTS idx_users_email;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);

      -- ── PoW challenge tokens (anti-spam for registration) ──────────
      CREATE TABLE IF NOT EXISTS pow_challenges (
        id          TEXT PRIMARY KEY,
        difficulty  INTEGER NOT NULL DEFAULT 4,
        created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        used        INTEGER NOT NULL DEFAULT 0
      );
    `,
  },
  {
    version: 5,
    name: 'chat_user_identity',
    up: `
      -- Track whether a chat message was sent by a logged-in user and their role.
      -- NULL = fully anonymous visitor.
      ALTER TABLE anon_messages ADD COLUMN user_handle TEXT;
      ALTER TABLE anon_messages ADD COLUMN user_role   TEXT;
    `,
  },
  {
    version: 6,
    name: 'admin_phrase',
    up: `
      -- Second-factor phrase for admin accounts.
      -- Login as admin requires username + password + this phrase.
      -- NULL = admin phrase not set (admin login blocked as a safe default).
      ALTER TABLE users ADD COLUMN admin_phrase_hash TEXT;
    `,
  },
];

export function runMigrations() {
  const db = getDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
  `);

  const applied = new Set(
    db.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version)
  );

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;
    console.log(`[DB] Applying migration ${migration.version}: ${migration.name}`);
    db.exec(migration.up);
    db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)').run(
      migration.version,
      migration.name
    );
    console.log(`[DB] Migration ${migration.version} applied.`);
  }

  console.log('[DB] All migrations up to date.');
}

if (process.argv[1].endsWith('migrate.js')) {
  runMigrations();
  process.exit(0);
}
