/**
 * src/utils/seed.js
 * Creates a default admin user if none exists.
 * Run with: npm run db:seed
 *
 * IMPORTANT: Set ADMIN_USERNAME and ADMIN_PASSWORD as environment variables.
 *            No credentials are hardcoded.
 *
 * Example:
 *   ADMIN_USERNAME=void ADMIN_PASSWORD=YourStr0ngP@ss npm run db:seed
 *
 * [AUDIT FIX C2] Uses shared hashPhraseForStorage() from authService
 * instead of inline SHA-256 — ensures consistent hashing + normalization.
 */
import bcrypt  from 'bcryptjs';
import crypto  from 'crypto';
import { getDatabase }   from '../config/database.js';
import { runMigrations } from './migrate.js';
import { env }           from '../config/env.js';
import { WORDLIST }      from './wordlist.js';
import { hashPhraseForStorage } from '../services/authService.js';

const adminUsername  = process.env.ADMIN_USERNAME;
const adminPassword  = process.env.ADMIN_PASSWORD;
const adminPhraseHash = process.env.ADMIN_PHRASE_HASH; // Pre-computed bcrypt hash — never plaintext

if (!adminUsername || !adminPassword) {
  console.error('[SEED] ✗ ADMIN_USERNAME and ADMIN_PASSWORD environment variables are required.');
  console.error('       Example: ADMIN_USERNAME=void ADMIN_PASSWORD=Str0ngP@ss! ADMIN_PHRASE_HASH="$2a$12$..." npm run db:seed');
  process.exit(1);
}

if (!adminPhraseHash || !adminPhraseHash.startsWith('$2')) {
  console.error('[SEED] ✗ ADMIN_PHRASE_HASH is required and must be a valid bcrypt hash (starts with $2a$ or $2b$).');
  console.error('       Generate with: node -e "import bcrypt from bcryptjs; console.log(await bcrypt.hash(yourPhrase, 12))"');
  process.exit(1);
}

if (adminPassword.length < 8) {
  console.error('[SEED] ✗ ADMIN_PASSWORD must be at least 8 characters.');
  process.exit(1);
}

runMigrations();
const db = getDatabase();

const existing = db.prepare("SELECT id FROM users WHERE role='admin'").get();
if (existing) {
  console.log('[SEED] Admin user already exists. Skipping.');
  process.exit(0);
}

// Generate 12-word recovery phrase
const words = [];
for (let i = 0; i < 12; i++) words.push(WORDLIST[crypto.randomInt(0, WORDLIST.length)]);
const recoveryPhrase = words.join(' ');

// [AUDIT FIX C2] Use shared bcrypt-based hashing (same as authService)
const recoveryHash    = await hashPhraseForStorage(recoveryPhrase);
const passwordHash    = await bcrypt.hash(adminPassword, env.bcrypt.rounds);
// adminPhraseHash is already bcrypt — insert directly, no re-hashing
db.prepare("INSERT INTO users (username, password, recovery_hash, admin_phrase_hash, role) VALUES (?, ?, ?, ?, 'admin')")
  .run(adminUsername.toLowerCase(), passwordHash, recoveryHash, adminPhraseHash);

console.log('[SEED] ✓ Admin user created successfully.');
console.log(`       Username: ${adminUsername.toLowerCase()}`);
console.log('       Password: [set via ADMIN_PASSWORD env var]');
console.log('       Admin phrase: [stored as hash only — plaintext never saved]');
console.log('');
console.log('  ╔══════════════════════════════════════════════════════════════╗');
console.log('  ║  ⚠  RECOVERY PHRASE — SAVE THIS NOW, SHOWN ONLY ONCE  ⚠    ║');
console.log('  ╠══════════════════════════════════════════════════════════════╣');
console.log(`  ║  ${recoveryPhrase.padEnd(60)}║`);
console.log('  ╚══════════════════════════════════════════════════════════════╝');
console.log('');
process.exit(0);
