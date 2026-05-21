/**
 * src/utils/migrate.js
 *
 * Database migration runner using Node.js built-in node:sqlite.
 * Run with: npm run db:migrate
 *
 * node:sqlite API differences from better-sqlite3:
 *  - db.exec()                      → same
 *  - db.prepare(sql).all()          → same (returns rows as objects)
 *  - db.prepare(sql).run(...values) → same
 *  - db.prepare(sql).get(...values) → same
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
        role        TEXT    NOT NULL DEFAULT 'user'
                            CHECK(role IN ('user', 'admin')),
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

      CREATE INDEX IF NOT EXISTS idx_users_email          ON users(email);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user  ON refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_uploads_user         ON uploads(user_id);

      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    INTEGER PRIMARY KEY,
        name       TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
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
