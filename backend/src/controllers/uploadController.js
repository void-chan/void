/**
 * src/controllers/uploadController.js
 *
 * HTTP handlers for file upload operations.
 * File is already on disk (multer ran first) when these handlers execute.
 */

import { saveUpload, getUserUploads, deleteUpload } from '../services/uploadService.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export function upload(req, res, next) {
  try {
    if (!req.file) {
      return sendError(res, 'No file uploaded.', 400);
    }

    const record = saveUpload(req.user.id, req.file);
    logger.info('File uploaded', { userId: req.user.id, fileId: record.id });

    return sendCreated(res, { file: record });
  } catch (err) {
    next(err);
  }
}

export function listUploads(req, res, next) {
  try {
    const uploads = getUserUploads(req.user.id);
    return sendSuccess(res, { uploads });
  } catch (err) {
    next(err);
  }
}

export function removeUpload(req, res, next) {
  try {
    const uploadId = parseInt(req.params.id, 10);
    if (isNaN(uploadId)) return sendError(res, 'Invalid upload ID.', 400);

    deleteUpload(uploadId, req.user.id);
    logger.info('File deleted', { userId: req.user.id, uploadId });

    return sendSuccess(res, { message: 'File deleted successfully.' });
  } catch (err) {
    next(err);
  }
}
