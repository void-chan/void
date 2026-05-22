/**
 * src/routes/auth.js
 * Authentication routes — username + recovery phrase system.
 *
 * [AUDIT FIXES H2, H3] Separate rate limiters for /recover and /refresh.
 */

import { Router } from 'express';
import { body }   from 'express-validator';
import { validate }       from '../middleware/validate.js';
import { requireAuth }    from '../middleware/auth.js';
import { authRateLimiter, recoverRateLimiter, refreshRateLimiter } from '../middleware/security.js';
import {
  challenge, register, login, refresh,
  recover, logout, logoutAll, me,
} from '../controllers/authController.js';

const router = Router();

// ── GET /api/auth/challenge — PoW challenge for registration ──────────────────
router.get('/challenge', authRateLimiter, challenge);

// ── POST /api/auth/register ──────────────────────────────────────────────────
router.post(
  '/register',
  authRateLimiter,
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 20 }).withMessage('Username must be 3–20 characters.')
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores.'),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
      .isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 0 })
      .withMessage('Password must contain uppercase, lowercase, and a number.'),
    body('challenge')
      .notEmpty().withMessage('PoW challenge is required.'),
    body('nonce')
      .isNumeric().withMessage('PoW nonce must be a number.'),
  ],
  validate,
  register
);

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post(
  '/login',
  authRateLimiter,
  [
    body('username').trim().notEmpty().withMessage('Username is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  validate,
  login
);

// ── POST /api/auth/recover — password reset via recovery phrase ───────────────
// [AUDIT FIX H2] Uses dedicated recoverRateLimiter (3 req/hr) — separate budget
// from login/register so an attacker can't exhaust both with one endpoint.
router.post(
  '/recover',
  recoverRateLimiter,
  [
    body('username').trim().notEmpty().withMessage('Username is required.'),
    body('recoveryPhrase').trim().notEmpty().withMessage('Recovery phrase is required.'),
    body('newPassword')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
      .isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 0 })
      .withMessage('Password must contain uppercase, lowercase, and a number.'),
  ],
  validate,
  recover
);

// ── POST /api/auth/refresh ───────────────────────────────────────────────────
// [AUDIT FIX H3] Rate-limited to prevent unlimited token minting from stolen cookie
router.post('/refresh', refreshRateLimiter, refresh);

// ── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', requireAuth, logout);

// ── POST /api/auth/logout-all ────────────────────────────────────────────────
router.post('/logout-all', requireAuth, logoutAll);

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', requireAuth, me);

export default router;
