/**
 * src/routes/uploads.js
 *
 * File upload routes — all require authentication.
 *
 * Endpoints:
 *  POST   /api/uploads         Upload a single file
 *  GET    /api/uploads         List current user's uploads
 *  DELETE /api/uploads/:id     Delete an upload (ownership enforced)
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { uploader, stripAndSave } from '../middleware/upload.js';
import { upload, listUploads, removeUpload } from '../controllers/uploadController.js';

const router = Router();

// All upload routes require authentication
router.use(requireAuth);

router.post('/',       uploader.single('file'), stripAndSave, upload);
router.get('/',        listUploads);
router.delete('/:id',  removeUpload);

export default router;
