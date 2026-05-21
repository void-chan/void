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
      styleSrc:       ["'self'", "'unsafe-inline'"], // Allow inline styles for Vite dev
      imgSrc:         ["'self'", 'data:', 'blob:'],
      connectSrc:     ["'self'"],
      fontSrc:        ["'self'"],                    // No external fonts — privacy
      objectSrc:      ["'none'"],
      frameSrc:       ["'none'"],
      baseUri:        ["'self'"],
      formAction:     ["'self'"],
      upgradeInsecureRequests: env.cookie.secure ? [] : null,
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
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

// ── No-Cache for API Responses ────────────────────────────────────────────────
export function noCacheMiddleware(_req, res, next) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  next();
}
