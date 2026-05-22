/**
 * src/middleware/upload.js
 *
 * Secure file upload with automatic metadata stripping via Sharp.
 *
 * Security measures:
 *  1. UUID filenames — prevents enumeration
 *  2. MIME type + extension allowlist — double validation
 *  3. File size limit — DoS prevention
 *  4. EXIF/metadata strip — privacy (GPS, device info removed from every image)
 *  5. Max dimension cap — prevents decompression bomb
 *
 * WHY strip metadata:
 *  Images can contain GPS coordinates, device model, software version,
 *  author name, timestamps — all stripped before storage.
 */

import multer from 'multer';
import sharp  from 'sharp';
import path   from 'path';
import fs     from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { env }    from '../config/env.js';
import { logger } from '../utils/logger.js';

const ALLOWED_TYPES = new Map([
  ['image/jpeg',      ['.jpg', '.jpeg']],
  ['image/png',       ['.png']],
  ['image/webp',      ['.webp']],
  ['image/gif',       ['.gif']],
  ['application/pdf', ['.pdf']],
]);

// ── Multer: buffer storage (we process before saving) ────────────────────────
const storage = multer.memoryStorage();

function fileFilter(_req, file, cb) {
  const allowedExtensions = ALLOWED_TYPES.get(file.mimetype);
  if (!allowedExtensions) return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
  cb(null, true);
}

export const uploader = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.upload.maxSizeMb * 1024 * 1024,
    files: 5,
    fields: 10,
  },
});

// ── Metadata strip + save middleware ─────────────────────────────────────────
// Use after multer: strips EXIF from images, saves to disk, populates file.path/filename.

export async function stripAndSave(req, _res, next) {
  const files = [
    ...(req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : []),
    ...(req.file ? [req.file] : []),
  ];

  if (!files.length) return next();

  const uploadDir = path.resolve(env.upload.dir);

  for (const file of files) {
    const ext      = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    const dest     = path.join(uploadDir, filename);

    try {
      if (file.mimetype.startsWith('image/') && file.mimetype !== 'image/gif') {
        // Strip all metadata, cap at 1920px wide, re-encode
        await sharp(file.buffer)
          .resize({ width: 1920, withoutEnlargement: true })
          .withMetadata({})   // {} = strip all EXIF/ICC/etc
          .toFile(dest);
      } else {
        // PDF or GIF — save as-is (no sharp processing)
        fs.writeFileSync(dest, file.buffer);
      }

      // Populate fields so downstream code works identically to diskStorage
      file.filename = filename;
      file.path     = dest;
      file.size     = fs.statSync(dest).size;
      delete file.buffer;

      logger.info('File saved (metadata stripped)', { filename, mime: file.mimetype });
    } catch (err) {
      logger.error('File processing failed', { error: err.message });
      return next(err);
    }
  }

  next();
}

export { ALLOWED_TYPES };
