/**
 * src/controllers/authController.js
 *
 * HTTP layer for authentication — thin by design.
 * Business logic lives in authService.js.
 */

import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  logoutAllDevices,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from '../services/authService.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export async function register(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await registerUser({ email, password });

    logger.info('User registered', { userId: user.id });
    return sendCreated(res, { message: 'Account created successfully.' });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await loginUser({ email, password });

    res
      .cookie('access_token',   accessToken,   accessTokenCookieOptions())
      .cookie('refresh_token',  refreshToken,  refreshTokenCookieOptions());

    logger.info('User logged in', { userId: user.id });
    return sendSuccess(res, { user });
  } catch (err) {
    next(err);
  }
}

export function refresh(req, res, next) {
  try {
    const rawRefreshToken = req.cookies?.refresh_token;
    if (!rawRefreshToken) {
      return sendError(res, 'No refresh token provided.', 401);
    }

    const { accessToken } = refreshAccessToken(rawRefreshToken);
    res.cookie('access_token', accessToken, accessTokenCookieOptions());

    return sendSuccess(res, { message: 'Access token refreshed.' });
  } catch (err) {
    next(err);
  }
}

export function logout(req, res, next) {
  try {
    const rawRefreshToken = req.cookies?.refresh_token;
    logoutUser(rawRefreshToken);

    // Clear both cookies
    res
      .clearCookie('access_token',  { path: '/' })
      .clearCookie('refresh_token', { path: '/api/auth/refresh' });

    logger.info('User logged out', { userId: req.user?.id });
    return sendSuccess(res, { message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
}

export function logoutAll(req, res, next) {
  try {
    logoutAllDevices(req.user.id);

    res
      .clearCookie('access_token',  { path: '/' })
      .clearCookie('refresh_token', { path: '/api/auth/refresh' });

    logger.info('User logged out all devices', { userId: req.user.id });
    return sendSuccess(res, { message: 'Logged out from all devices.' });
  } catch (err) {
    next(err);
  }
}

export function me(req, res) {
  // req.user is set by requireAuth middleware
  return sendSuccess(res, { user: req.user });
}
