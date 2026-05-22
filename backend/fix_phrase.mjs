/**
 * Temporary one-time script: resets admin phrase hash.
 * Run from Railway shell: node fix_phrase.mjs
 * Delete after use.
 */
import bcrypt from 'bcryptjs';
import { getDatabase } from './src/config/database.js';
import { runMigrations } from './src/utils/migrate.js';

runMigrations();
const db = getDatabase();

const phrase = 'void admin secret key phrase two zero two six';
const hash = await bcrypt.hash(phrase, 12);

const result = db.prepare('UPDATE users SET admin_phrase_hash=? WHERE username=?').run(hash, 'void');

if (result.changes > 0) {
  console.log('✓ Admin phrase hash updated successfully.');
  console.log('  Admin phrase:', phrase);
} else {
  console.log('✗ No user found with username "void". Check the username.');
}
