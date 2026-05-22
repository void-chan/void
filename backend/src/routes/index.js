/** src/routes/index.js */
import { Router } from 'express';
import authRoutes   from './auth.js';
import chatRoutes   from './chat.js';
import blogRoutes   from './blog.js';
import inboxRoutes  from './inbox.js';
import uploadRoutes from './uploads.js';
import walletRoutes from './wallet.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

router.use('/auth',    authRoutes);
router.use('/chat',    chatRoutes);
router.use('/blog',    blogRoutes);
router.use('/inbox',   inboxRoutes);
router.use('/uploads', uploadRoutes);
router.use('/wallet',  walletRoutes);

export default router;
