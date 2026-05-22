/**
 * src/middleware/security.js
 *
 * Security middleware stack applied to every request.
 *
 * WHY each piece:
 *  - helmet:       Sets ~15 security-related HTTP headers automatically
 *  - rate limiter: Prevents brute-force, DoS on all routes
 *  - auth limiter: Extra-strict limit on login/register endpoints
 *  - cors:         Restricts which origins can call the API (same-origin by default)
 *  - no-cache:     Prevents sensitive responses from being cached by proxies
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

// ── Global Rate Limiter ───────────────────────────────────────────────────────
export const globalRateLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (_req, res) =>
    sendError(res, 'Too many requests, please try again later.', 429),
});

// ── Auth Rate Limiter (stricter) ──────────────────────────────────────────────
export const authRateLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.authMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (_req, res) =>
    sendError(res, 'Too many authentication attempts. Try again later.', 429),
});

// ── [AUDIT FIX H2] Recovery Rate Limiter — very strict ────────────────────────
// Only 3 recovery attempts per hour per IP. Recovery phrase brute-force is
// infeasible (2^132) but this prevents abuse of the endpoint.
export const recoverRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour window
  max: 3,                      // 3 attempts per hour per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (_req, res) =>
    sendError(res, 'Too many recovery attempts. Try again in 1 hour.', 429),
});

// ── [AUDIT FIX H3] Refresh Rate Limiter ───────────────────────────────────────
// Prevents unlimited access token minting from a compromised refresh token.
export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minute window
  max: 30,                     // Generous for legitimate use, blocks abuse
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
