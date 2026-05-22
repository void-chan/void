/** src/controllers/inboxController.js */
import { sendMessage, getAdminMessages, markRead, deleteMessage } from '../services/inboxService.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';

export async function send(req, res, next) {
  try {
    const { subject, body } = req.body;
    if (!subject?.trim() || !body?.trim()) {
      return sendError(res, 'Subject and body are required.', 400);
    }
    const files = req.files ?? [];
    const msg = await sendMessage(req.user.id, { subject, body }, files);
    return sendCreated(res, { message: msg });
  } catch (err) { next(err); }
}

export function list(req, res, next) {
  try {
    return sendSuccess(res, { messages: getAdminMessages() });
  } catch (err) { next(err); }
}

export function read(req, res, next) {
  try {
    markRead(Number(req.params.id));
    return sendSuccess(res, { message: 'Marked as read.' });
  } catch (err) { next(err); }
}

export function remove(req, res, next) {
  try {
    deleteMessage(Number(req.params.id));
    return sendSuccess(res, { message: 'Message deleted.' });
  } catch (err) { next(err); }
}
