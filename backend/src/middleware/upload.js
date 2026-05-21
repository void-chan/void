/**
 * src/middleware/upload.js
 *
 * Multer configuration for secure local file uploads.
 *
 * Security measures applied:
 *  1. Randomized UUIDs for stored filenames → prevents enumeration
 *  2. MIME type allowlist → prevents malicious file types
 *  3. File size limit → prevents DoS via large uploads
 *  4. Path validation → prevents directory traversal
 *  5. Extension check alongside MIME → double validation layer
 *
 * WHY store files locally instead of Base64 in DB:
 *  - Base64 inflates size by ~33% and bloats the DB
 *  - DB queries slow down when blobs are mixed with structured data
 *  - Files on disk can be served by a static file server more efficiently
 */

import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';

// Allowed MIME types and their safe extensions
const ALLOWED_TYPES = new Map([
  ['image/jpeg',    ['.jpg', '.jpeg']],
  ['image/png',     ['.png']],
  ['image/webp',    ['.webp']],
  ['image/gif',     ['.gif']],
  ['application/pdf', ['.pdf']],
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve(env.upload.dir));
  },
  filename: (_req, file, cb) => {
    // UUID + original extension → unpredictable name, retains type hint
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${uuidv4()}${ext}`;
    cb(null, safeName);
  },
});

function fileFilter(_req, file, cb) {
  const allowedExtensions = ALLOWED_TYPES.get(file.mimetype);
  if (!allowedExtensions) {
    return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
  }

  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
  }

  cb(null, true);
}

export const uploader = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.upload.maxSizeMb * 1024 * 1024,
    files: 5,          // Max 5 files per request
    fields: 10,        // Limit non-file fields too
  },
});

export { ALLOWED_TYPES };
