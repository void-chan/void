/** src/routes/inbox.js */
import { Router }  from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uploader, stripAndSave } from '../middleware/upload.js';
import { send, list, read, remove } from '../controllers/inboxController.js';

const router = Router();

// Registered user sends message to admin (with optional image attachments)
router.post('/', requireAuth, uploader.array('files', 3), stripAndSave, send);

// Admin only: list all messages
router.get('/', requireAuth, requireRole('admin'), list);

// Admin: mark as read
router.patch('/:id/read', requireAuth, requireRole('admin'), read);

// Admin: delete message + attachments
router.delete('/:id', requireAuth, requireRole('admin'), remove);

export default router;
