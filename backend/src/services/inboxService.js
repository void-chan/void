/**
 * src/services/inboxService.js
 *
 * Admin inbox — registered users can send messages (+ attachments) to admin.
 */

import path from 'path';
import fs   from 'fs';
import { getDatabase } from '../config/database.js';
import { env }         from '../config/env.js';
import { logger }      from '../utils/logger.js';

export function sendMessage(senderId, { subject, body }, files = []) {
  const db = getDatabase();

  const result = db
    .prepare('INSERT INTO admin_inbox (sender_id, subject, body) VALUES (?, ?, ?)')
    .run(senderId, subject.trim(), body.trim());

  const messageId = result.lastInsertRowid;

  for (const file of files) {
    const relativePath = path.relative(
      path.resolve(env.upload.dir, '..'),
      file.path
    ).replace(/\\/g, '/');

    db.prepare(
      `INSERT INTO inbox_attachments
         (message_id, original_name, stored_name, mime_type, size_bytes, path)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      messageId,
      sanitizeFilename(file.originalname),
      file.filename,
      file.mimetype,
      file.size,
      relativePath
    );
  }

  return db.prepare('SELECT * FROM admin_inbox WHERE id = ?').get(messageId);
}

export function getAdminMessages() {
  const db = getDatabase();
  const messages = db
    .prepare(
      `SELECT m.id, m.subject, m.body, m.is_read, m.created_at,
              u.username as sender_username
       FROM admin_inbox m
       JOIN users u ON u.id = m.sender_id
       ORDER BY m.created_at DESC`
    )
    .all();

  return messages.map((msg) => ({
    ...msg,
    attachments: db
      .prepare('SELECT id, original_name, mime_type, size_bytes, path FROM inbox_attachments WHERE message_id = ?')
      .all(msg.id),
  }));
}

export function markRead(messageId) {
  getDatabase().prepare('UPDATE admin_inbox SET is_read = 1 WHERE id = ?').run(messageId);
}

export function deleteMessage(messageId) {
  const db = getDatabase();

  const attachments = db
    .prepare('SELECT stored_name FROM inbox_attachments WHERE message_id = ?')
    .all(messageId);

  db.prepare('DELETE FROM admin_inbox WHERE id = ?').run(messageId);

  for (const att of attachments) {
    const fullPath = path.resolve(env.upload.dir, att.stored_name);
    try {
      fs.unlinkSync(fullPath);
    } catch (err) {
      logger.warn('Could not delete attachment', { error: err.message });
    }
  }
}

function sanitizeFilename(name) {
  return path.basename(name).replace(/[^a-zA-Z0-9._\- ]/g, '_').slice(0, 255);
}
