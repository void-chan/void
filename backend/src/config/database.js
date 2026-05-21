/**
 * src/config/database.js
 *
 * SQLite connection singleton using Node.js built-in `node:sqlite`.
 *
 * WHY node:sqlite (built-in, Node 22+) instead of better-sqlite3:
 *  - Zero native compilation — works on Windows without Visual Studio build tools
 *  - No extra npm dependency — built into the Node runtime
 *  - Synchronous API (same DX as better-sqlite3) — no callback complexity
 *  - Stable in Node 22+ (LTS), fully supported in Node 25
 *
 * node:sqlite API reference:
 *  https://nodejs.org/api/sqlite.html
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let _db = null;

export function getDatabase() {
  if (_db) return _db;

  const dbPath = path.resolve(__dirname, '../../', env.db.path);

  _db = new DatabaseSync(dbPath);

  // Performance & safety pragmas
  _db.exec('PRAGMA journal_mode = WAL');       // Better concurrency
  _db.exec('PRAGMA foreign_keys = ON');         // Enforce relational integrity
  _db.exec('PRAGMA synchronous = NORMAL');      // Safe + faster than FULL
  _db.exec('PRAGMA cache_size = -32000');       // ~32MB cache
  _db.exec('PRAGMA temp_store = MEMORY');       // Temp tables in memory

  return _db;
}

export function closeDatabase() {
  if (_db) {
    _db.close();
    _db = null;
  }
}
