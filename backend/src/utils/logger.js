/**
 * src/utils/logger.js
 *
 * Minimal structured logger with sensitive data redaction.
 *
 * WHY custom logger instead of winston/pino:
 *  - Zero extra dependencies for a simple local app
 *  - Full control over what gets logged
 *  - Redaction prevents accidental secret leakage in logs
 */

const REDACTED = '[REDACTED]';

// Fields that should never appear in logs
// [AUDIT FIX L3] Added recovery phrase fields
const SENSITIVE_FIELDS = new Set([
  'password',
  'password_hash',
  'token',
  'refresh_token',
  'secret',
  'authorization',
  'cookie',
  'credit_card',
  'ssn',
  'recoveryphrase',
  'newrecoveryphrase',
  'recovery_hash',
  'recoveryPhrase',
  'newRecoveryPhrase',
]);

/**
 * Deep-clone an object and redact sensitive keys.
 */
function redact(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(redact);

  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      SENSITIVE_FIELDS.has(k.toLowerCase()) ? REDACTED : redact(v),
    ])
  );
}

function timestamp() {
  return new Date().toISOString();
}

function format(level, message, meta) {
  const base = `[${timestamp()}] [${level.toUpperCase()}] ${message}`;
  if (meta !== undefined) {
    try {
      return base + ' ' + JSON.stringify(redact(meta));
    } catch {
      return base + ' [unstringifiable meta]';
    }
  }
  return base;
}

export const logger = {
  info:  (msg, meta) => console.log(format('info', msg, meta)),
  warn:  (msg, meta) => console.warn(format('warn', msg, meta)),
  error: (msg, meta) => console.error(format('error', msg, meta)),
  debug: (msg, meta) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(format('debug', msg, meta));
    }
  },
};
