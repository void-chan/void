/**
 * src/services/uploadService.js
 *
 * File upload business logic — records uploads in DB, handles deletions.
 *
 * WHY separate service from multer middleware:
 *  - Middleware handles transport (disk storage)
 *  - Service handles business logic (DB record, validation, cleanup)
 *  - Easier to add virus scanning, image resizing, etc. later
 */

import path from 'path';
import fs from 'fs';
import { getDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Records a successfully uploaded file in the database.
 */
export function saveUpload(userId, file) {
  const db = getDatabase();

  // Store a relative path — never store absolute paths
  // WHY: Absolute paths leak server directory structure and break on migration
  const relativePath = path.relative(
    path.resolve(env.upload.dir, '..'),
    file.path
  ).replace(/\\/g, '/'); // Normalize to forward slashes

  const result = db
    .prepare(
      `INSERT INTO uploads (user_id, original_name, stored_name, mime_type, size_bytes, path)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      sanitizeFilename(file.originalname),
      file.filename,
      file.mimetype,
      file.size,
      relativePath
    );

  return db
    .prepare('SELECT * FROM uploads WHERE id = ?')
    .get(result.lastInsertRowid);
}

/**
 * Fetch all uploads belonging to a user.
 */
export function getUserUploads(userId) {
  const db = getDatabase();
  return db
    .prepare('SELECT id, original_name, mime_type, size_bytes, path, created_at FROM uploads WHERE user_id = ?')
    .all(userId);
}

/**
 * Delete an upload by ID — validates ownership before deletion.
 * Removes both the DB record and the physical file.
 */
export function deleteUpload(uploadId, userId) {
  const db = getDatabase();

  const upload = db
    .prepare('SELECT * FROM uploads WHERE id = ? AND user_id = ?')
    .get(uploadId, userId);

  if (!upload) {
    const err = new Error('Upload not found or access denied.');
    err.statusCode = 404;
    throw err;
  }

  // Delete DB record first — if file delete fails, the record is gone = safer
  db.prepare('DELETE FROM uploads WHERE id = ?').run(uploadId);

  // Delete physical file
  const fullPath = path.resolve(env.upload.dir, upload.stored_name);

  // Safety: ensure the resolved path is within the upload directory
  const uploadDir = path.resolve(env.upload.dir);
  if (!fullPath.startsWith(uploadDir)) {
    logger.error('Directory traversal attempt in deleteUpload', { stored_name: upload.stored_name });
    return; // DB record already deleted; don't touch FS
  }

  try {
    fs.unlinkSync(fullPath);
  } catch (err) {
    // File missing from disk — log but don't throw (DB already cleaned up)
    logger.warn('Could not delete upload file from disk', { path: fullPath, error: err.message });
  }
}

/**
 * Strip potentially dangerous characters from filenames.
 * Only keep safe characters for display purposes.
 */
function sanitizeFilename(name) {
  return path.basename(name).replace(/[^a-zA-Z0-9._\- ]/g, '_').slice(0, 255);
}
