/**
 * src/middleware/errorHandler.js
 *
 * Global error handling middleware — must be the LAST middleware registered.
 *
 * WHY centralized error handling:
 *  - Prevents stack traces from leaking to clients in production
 *  - Ensures all errors return the same JSON shape
 *  - Single place to add error monitoring / alerting in future
 */

import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Log full error internally (with redaction)
  logger.error('Unhandled error', {
    message:  err.message,
    method:   req.method,
    path:     req.path,
    // Only include stack in dev
    ...(env.isDev && { stack: err.stack }),
  });

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: `File too large. Maximum size is ${env.upload.maxSizeMb}MB.`,
    });
  }

  // Syntax error in JSON body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body.',
    });
  }

  const statusCode = err.statusCode ?? err.status ?? 500;

  res.status(statusCode).json({
    success: false,
    // Never expose internal error details in production
    message: env.isDev ? err.message : 'Internal server error.',
  });
}

// 404 fallback for unmatched routes
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found.`,
  });
}
