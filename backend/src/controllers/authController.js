/**
 * src/controllers/authController.js
 * HTTP layer for authentication — thin by design.
 */

import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  logoutAllDevices,
  recoverAccount,
  createChallenge,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from '../services/authService.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export function challenge(_req, res, next) {
  try {
    const data = createChallenge();
    return sendSuccess(res, data);
  } catch (err) { next(err); }
}

export async function register(req, res, next) {
  try {
    const { username, password, challenge, nonce } = req.body;
    const { user, recoveryPhrase } = await registerUser({ username, password, challenge, nonce });

    logger.info('User registered', { userId: user.id });
    // Return recovery phrase — shown ONCE to the user
    return sendCreated(res, {
      message: 'Account created. Save your recovery phrase — it will not be shown again.',
      recoveryPhrase,
    });
  } catch (err) { next(err); }
}

export async function login(req, res, next) {
  try {
    const { username, password, adminPhrase } = req.body;
    const { user, accessToken, refreshToken } = await loginUser({ username, password, adminPhrase });

    res
      .cookie('access_token',  accessToken,  accessTokenCookieOptions())
      .cookie('refresh_token', refreshToken, refreshTokenCookieOptions());

    logger.info('User logged in', { userId: user.id });
    return sendSuccess(res, { user });
  } catch (err) { next(err); }
}

export function refresh(req, res, next) {
  try {
    const rawRefreshToken = req.cookies?.refresh_token;
    if (!rawRefreshToken) return sendError(res, 'No refresh token provided.', 401);

    const { accessToken } = refreshAccessToken(rawRefreshToken);
    res.cookie('access_token', accessToken, accessTokenCookieOptions());
    return sendSuccess(res, { message: 'Access token refreshed.' });
  } catch (err) { next(err); }
}

export async function recover(req, res, next) {
  try {
    const { username, recoveryPhrase, newPassword } = req.body;
    const { newRecoveryPhrase, userId } = await recoverAccount({ username, recoveryPhrase, newPassword });

    // [AUDIT FIX C5] Log only verified userId, never raw username from req.body
    logger.info('Account recovered', { userId });
    return sendSuccess(res, {
      message: 'Password reset successfully. Save your NEW recovery phrase — the old one is now invalid.',
      newRecoveryPhrase,
    });
  } catch (err) { next(err); }
}

export function logout(req, res, next) {
  try {
    logoutUser(req.cookies?.refresh_token);
    res.clearCookie('access_token',  { path: '/' })
       .clearCookie('refresh_token', { path: '/api/auth/refresh' });
    logger.info('User logged out', { userId: req.user?.id });
    return sendSuccess(res, { message: 'Logged out successfully.' });
  } catch (err) { next(err); }
}

export function logoutAll(req, res, next) {
  try {
    logoutAllDevices(req.user.id);
    res.clearCookie('access_token',  { path: '/' })
       .clearCookie('refresh_token', { path: '/api/auth/refresh' });
    logger.info('User logged out all devices', { userId: req.user.id });
    return sendSuccess(res, { message: 'Logged out from all devices.' });
  } catch (err) { next(err); }
}

export function me(req, res) {
  return sendSuccess(res, { user: req.user });
}
