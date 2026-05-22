/** src/controllers/chatController.js */
import { getChatState, postMessage, getChatTimings } from '../services/chatService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export function getChat(req, res, next) {
  try {
    const state = getChatState();
    return sendSuccess(res, state);
  } catch (err) { next(err); }
}

export function sendChatMessage(req, res, next) {
  try {
    const { content } = req.body;
    if (!content || typeof content !== 'string') {
      return sendError(res, 'Message content is required.', 400);
    }

    // Prefer logged-in username; fall back to anon handle
    const userHandle = req.user ? req.user.username : null;
    const userRole   = req.user ? req.user.role   : null;
    const displayHandle = userHandle ?? req.anonHandle;

    const message = postMessage(req.anonId, displayHandle, content, userHandle, userRole);
    return sendSuccess(res, { message, ...getChatTimings() }, 201);
  } catch (err) {
    if (err.isSpam) {
      return sendError(res, err.message, 429);
    }
    next(err);
  }
}

export function getChatInfo(req, res) {
  // Show logged-in username if available, else anon handle
  const handle     = req.user ? req.user.username : req.anonHandle;
  const userRole   = req.user ? req.user.role : null;
  return sendSuccess(res, {
    handle,
    userRole,
    ...getChatTimings(),
  });
}
