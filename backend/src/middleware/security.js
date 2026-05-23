/**
 * src/middleware/security.js
 *
 * Security middleware stack applied to every request.
 *
 * WHY each piece:
 *  - helmet:       Sets ~15 security-related HTTP headers automatically
 *  - rate limiter: Only on auth endpoints to prevent brute-force attacks
 *  - cors:         Restricts which origins can call the API (same-origin by default)
 *  - no-cache:     Prevents sensitive responses from being cached by proxies
 *
 * NOTE: No global rate limiter — Railway quota is generous enough.
 *       Rate limits are applied ONLY to security-sensitive endpoints
 *       (login, register, recover, refresh) to prevent brute-force.
 */

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { env } from '../config/env.js';
import { sendError } from '../utils/response.js';

// ── Helmet ───────────────────────────────────────────────────────────────────
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'"],
      styleSrc:       ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc:         ["'self'", 'data:', 'blob:'],
      connectSrc:     ["'self'"],
      fontSrc:        ["'self'", 'https://fonts.gstatic.com'],
      objectSrc:      ["'none'"],
      frameSrc:       ["'none'"],
      baseUri:        ["'self'"],
      formAction:     ["'self'"],
      upgradeInsecureRequests: env.cookie.secure ? [] : null,
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: env.cookie.secure
    ? { maxAge: 31536000, includeSubDomains: true }
    : false,
});

// ── CORS ─────────────────────────────────────────────────────────────────────
export const corsMiddleware = cors({
  origin: env.cors.origin,
  credentials: true,             // Required for HTTP-only cookie auth
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  exposedHeaders: [],
  maxAge: 86400,                 // Cache preflight for 24h
});

// ── Auth Rate Limiter ─────────────────────────────────────────────────────────
// Applied ONLY to login/register/challenge — prevents credential brute-force.
// 50 attempts per 15 min is generous for real users, blocks automated attacks.
export const authRateLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,   // Don't count successful logins
  handler: (_req, res) =>
    sendError(res, 'Too many authentication attempts. Try again later.', 429),
});

// ── [AUDIT FIX H2] Recovery Rate Limiter ──────────────────────────────────────
// 10 recovery attempts per hour per IP. Recovery phrase brute-force is
// infeasible (2^132) but this prevents abuse of the endpoint.
export const recoverRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour window
  max: 10,                     // 10 attempts per hour per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (_req, res) =>
    sendError(res, 'Too many recovery attempts. Try again in 1 hour.', 429),
});

// ── [AUDIT FIX H3] Refresh Rate Limiter ───────────────────────────────────────
// Prevents unlimited access token minting from a compromised refresh token.
// 120 per 15 min is plenty for legitimate tab usage + auto-refresh.
export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minute window
  max: 120,                    // Very generous for legitimate use
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) =>
    sendError(res, 'Too many refresh requests. Try again later.', 429),
});

// ── No-Cache for API Responses ────────────────────────────────────────────────
export function noCacheMiddleware(_req, res, next) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  next();
}
