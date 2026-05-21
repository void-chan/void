/**
 * src/routes/auth.js
 *
 * Authentication routes with input validation rules.
 *
 * WHY validation at route level:
 *  - Validation is part of the route contract — co-locating it makes it obvious
 *  - Sanitization (.trim(), .normalizeEmail()) prevents subtle injection vectors
 *  - .isStrongPassword() enforces minimum password quality at the API boundary
 */

import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/security.js';
import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  me,
} from '../controllers/authController.js';

const router = Router();

// ── POST /api/auth/register ──────────────────────────────────────────────────
router.post(
  '/register',
  authRateLimiter,
  [
    body('email')
      .trim()
      .isEmail().withMessage('A valid email address is required.')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
      .isStrongPassword({
        minLength:        8,
        minLowercase:     1,
        minUppercase:     1,
        minNumbers:       1,
        minSymbols:       0,
      }).withMessage('Password must contain uppercase, lowercase, and a number.'),
  ],
  validate,
  register
);

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post(
  '/login',
  authRateLimiter,
  [
    body('email')
      .trim()
      .isEmail().withMessage('A valid email address is required.')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required.'),
  ],
  validate,
  login
);

// ── POST /api/auth/refresh ───────────────────────────────────────────────────
// Refresh endpoint scoped to path '/api/auth/refresh' (matches cookie path)
router.post('/refresh', refresh);

// ── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', requireAuth, logout);

// ── POST /api/auth/logout-all ────────────────────────────────────────────────
router.post('/logout-all', requireAuth, logoutAll);

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', requireAuth, me);

export default router;
