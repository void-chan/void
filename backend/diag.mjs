// Temporary diagnostic script — delete after use
import { getDatabase } from './src/config/database.js';
import { runMigrations } from './src/utils/migrate.js';

runMigrations();
const db = getDatabase();

console.log('=== Blog Posts ===');
const posts = db.prepare('SELECT id, slug, title, image_stored FROM blog_posts').all();
console.log(JSON.stringify(posts, null, 2));

console.log('\n=== ENV Check ===');
console.log('UPLOAD_DIR:', process.env.UPLOAD_DIR || '(not set)');
console.log('NODE_ENV:', process.env.NODE_ENV || '(not set)');
console.log('DB_PATH:', process.env.DB_PATH || '(not set)');
console.log('CORS_ORIGIN:', process.env.CORS_ORIGIN || '(not set)');
console.log('COOKIE_SAME_SITE:', process.env.COOKIE_SAME_SITE || '(not set)');
console.log('COOKIE_SECURE:', process.env.COOKIE_SECURE || '(not set)');
