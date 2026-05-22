/** src/routes/blog.js */
import { Router }     from 'express';
import { body }       from 'express-validator';
import { validate }   from '../middleware/validate.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import { uploader, stripAndSave } from '../middleware/upload.js';
import { list, show, create, update, remove } from '../controllers/blogController.js';

const router = Router();

// Public: list posts
router.get('/', optionalAuth, list);

// Public: single post (optionalAuth so admin can see drafts)
router.get('/:slug', optionalAuth, show);

// Admin: create with optional image
router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  uploader.single('image'),
  stripAndSave,
  [
    body('title').trim().notEmpty().withMessage('Title required.').isLength({ max: 200 }),
    body('body').trim().notEmpty().withMessage('Body required.'),
  ],
  validate,
  create
);

// Admin: update (supports optional image replacement via multipart)
router.patch('/:id', requireAuth, requireRole('admin'), uploader.single('image'), stripAndSave, update);

// Admin: delete
router.delete('/:id', requireAuth, requireRole('admin'), remove);

export default router;
