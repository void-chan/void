/**
 * src/middleware/auth.js
 *
 * JWT authentication middleware using HTTP-only cookies.
 *
 * WHY HTTP-only cookies instead of localStorage:
 *  - localStorage is accessible to JavaScript → vulnerable to XSS theft
 *  - HTTP-only cookies cannot be read by JS → XSS cannot steal the token
 *  - Combined with SameSite=Strict, effectively mitigates CSRF too
 *
 * Flow: Cookie → verify JWT → attach user to req → next()
 */

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { sendUnauthorized, sendForbidden } from '../utils/response.js';

/**
 * Verifies the access token from the HTTP-only cookie.
 * Attaches decoded payload to req.user on success.
 */
export function requireAuth(req, res, next) {
  const token = req.cookies?.access_token;

  if (!token) {
    return sendUnauthorized(res, 'No access token provided.');
  }

  try {
    const payload = jwt.verify(token, env.jwt.secret, {
      algorithms: ['HS256'],
      issuer:     env.jwt.issuer,
      audience:   env.jwt.audience,
    });
    req.user = {
      id:       payload.sub,
      username: payload.username,
      role:     payload.role,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendUnauthorized(res, 'Access token expired.');
    }
    return sendUnauthorized(res, 'Invalid access token.');
  }
}

/**
 * Role-based access control guard.
 * Usage: requireRole('admin') — returns middleware.
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return sendUnauthorized(res);
    if (!roles.includes(req.user.role)) {
      return sendForbidden(res, 'Insufficient permissions.');
    }
    next();
  };
}

/**
 * Optional auth — attaches user if token is present, does not reject if missing.
 * Useful for routes that show different content for guests vs logged-in users.
 */
export function optionalAuth(req, res, next) {
  const token = req.cookies?.access_token;
  if (!token) return next();

  try {
    const payload = jwt.verify(token, env.jwt.secret, {
      algorithms: ['HS256'],
      issuer:     env.jwt.issuer,
      audience:   env.jwt.audience,
    });
    req.user = { id: payload.sub, username: payload.username, role: payload.role };
  } catch {
    // Silently ignore invalid token for optional routes
  }
  next();
}
