/**
 * src/routes/index.js
 *
 * Central route registry — mounts all route modules under their prefixes.
 *
 * WHY centralize routes:
 *  - Single place to see all API endpoints at a glance
 *  - Easy to add versioning (/api/v2/...) later without touching server.js
 *  - Health check endpoint exposes no sensitive data
 */

import { Router } from 'express';
import authRoutes    from './auth.js';
import uploadRoutes  from './uploads.js';

const router = Router();

// ── Health ───────────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Feature Routes ───────────────────────────────────────────────────────────
router.use('/auth',    authRoutes);
router.use('/uploads', uploadRoutes);

export default router;
