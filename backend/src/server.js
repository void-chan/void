/**
 * src/server.js
 *
 * Application entry point.
 *
 * Architecture decisions:
 *  - express.json() body limit set explicitly → prevents large payload DoS
 *  - cookieParser before routes (required for cookie-based auth)
 *  - Static file serving for uploads uses express.static with explicit options
 *  - Graceful shutdown ensures DB connection is closed cleanly
 *  - Migrations run automatically at startup → zero manual steps
 */

import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import { env } from './config/env.js';
import { getDatabase, closeDatabase } from './config/database.js';
import { runMigrations } from './utils/migrate.js';
import { logger } from './utils/logger.js';
import {
  helmetMiddleware,
  corsMiddleware,
  globalRateLimiter,
  noCacheMiddleware,
} from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Initialize database ───────────────────────────────────────────────────────
getDatabase(); // Ensure connection is open
runMigrations();

// ── Create app ────────────────────────────────────────────────────────────────
const app = express();

// ── Security middleware (applied first) ───────────────────────────────────────
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.options('*', corsMiddleware); // Handle preflight requests
app.use(globalRateLimiter);
app.use(noCacheMiddleware);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));        // Prevent large JSON payload DoS
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());

// ── Static file serving for uploads ──────────────────────────────────────────
// WHY separate from app uploads: serve files with strict headers, no directory listing
const uploadsDir = path.resolve(__dirname, '../', env.upload.dir);
app.use(
  '/files',
  express.static(uploadsDir, {
    index:       false,    // No directory listing
    dotfiles:    'deny',   // Block hidden files
    etag:        true,
    maxAge:      '1d',
    setHeaders:  (res) => {
      // Prevent files from being rendered as HTML (XSS vector)
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', 'attachment'); // Force download
    },
  })
);

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ── Error handlers (must be last) ────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
const server = app.listen(env.port, env.host, () => {
  logger.info(`Server running on http://${env.host}:${env.port}`, {
    env: env.nodeEnv,
  });
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
function shutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    closeDatabase();
    logger.info('Server and database closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { message: err.message, stack: err.stack });
  shutdown('uncaughtException');
});
