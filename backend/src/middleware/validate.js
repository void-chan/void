/**
 * src/middleware/validate.js
 *
 * express-validator integration — extracts and returns validation errors.
 *
 * WHY express-validator:
 *  - Declarative, chainable rules co-located with routes
 *  - Handles sanitization (trimming, escaping) alongside validation
 *  - Prevents XSS via .escape() and injection via type-checking
 */

import { validationResult } from 'express-validator';
import { sendValidationError } from '../utils/response.js';

/**
 * Place AFTER validation rule chains in a route.
 * Returns 422 with structured errors if validation fails.
 */
export function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const errors = result.array().map((e) => ({
      field:   e.path,
      message: e.msg,
    }));
    return sendValidationError(res, errors);
  }
  next();
}
