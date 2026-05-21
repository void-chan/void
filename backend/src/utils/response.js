/**
 * src/utils/response.js
 *
 * Standardized API response helpers.
 *
 * WHY: Consistent response shape across all endpoints makes the
 * frontend predictable and eliminates per-route formatting decisions.
 *
 * Shape: { success, data?, message?, errors? }
 */

export function sendSuccess(res, data = null, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

export function sendCreated(res, data = null) {
  return sendSuccess(res, data, 201);
}

export function sendError(res, message = 'An error occurred', statusCode = 500, errors = null) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
}

export function sendValidationError(res, errors) {
  return sendError(res, 'Validation failed', 422, errors);
}

export function sendUnauthorized(res, message = 'Unauthorized') {
  return sendError(res, message, 401);
}

export function sendForbidden(res, message = 'Forbidden') {
  return sendError(res, message, 403);
}

export function sendNotFound(res, message = 'Not found') {
  return sendError(res, message, 404);
}
