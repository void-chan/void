/** src/routes/chat.js */
import { Router } from 'express';
import { body }   from 'express-validator';
import { validate } from '../middleware/validate.js';
import { anonymousSession } from '../middleware/anonymousSession.js';
import { optionalAuth } from '../middleware/auth.js';
import { getChat, sendChatMessage, getChatInfo } from '../controllers/chatController.js';

const router = Router();

// Identify logged-in user (if any) — does NOT block anonymous visitors
router.use(optionalAuth);
// All chat routes also need an anon session cookie for the chat handle fallback
router.use(anonymousSession);

// GET /api/chat — fetch messages + reset info
router.get('/', getChat);

// GET /api/chat/me — get own handle + timing
router.get('/me', getChatInfo);

// POST /api/chat — send anonymous message
router.post(
  '/',
  [
    body('content')
      .trim()
      .notEmpty().withMessage('Message cannot be empty.')
      .isLength({ max: 2000 }).withMessage('Message too long.'),
  ],
  validate,
  sendChatMessage
);

export default router;
