/**
 * src/services/blogService.js
 * Blog post CRUD — includes wallet addresses + image support.
 */

import path from 'path';
import fs   from 'fs';
import { getDatabase } from '../config/database.js';
import { logger }      from '../utils/logger.js';
import { env }         from '../config/env.js';

function generateSlug(title) {
  return title.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
    .slice(0, 80) + '-' + Date.now().toString(36);
}

export function listPosts(includeUnpublished = false) {
  const db = getDatabase();
  // Public visitors only see published posts; admins see everything
  const where = includeUnpublished ? '' : 'WHERE p.is_published = 1';
  return db.prepare(
    `SELECT p.id, p.title, p.slug, p.body, p.is_published,
            p.wallet_enabled, p.eth_address, p.btc_address,
            p.image_stored, p.image_original, p.image_mime,
            p.created_at, p.updated_at
     FROM blog_posts p JOIN users u ON u.id = p.author_id
     ${where}
     ORDER BY p.created_at DESC`
  ).all();
}

export function getPost(slug, isAdmin = false) {
  const db = getDatabase();
  // Non-admins can only see published posts
  const publishedFilter = isAdmin ? '' : 'AND p.is_published = 1';
  const post = db.prepare(
    `SELECT p.id, p.title, p.slug, p.body, p.is_published,
            p.wallet_enabled, p.eth_address, p.btc_address,
            p.image_stored, p.image_original, p.image_mime,
            p.created_at, p.updated_at
     FROM blog_posts p JOIN users u ON u.id = p.author_id
     WHERE p.slug = ? ${publishedFilter}`
  ).get(slug);
  if (!post) { const e = new Error('Post not found.'); e.statusCode = 404; throw e; }
  return post;
}

export function createPost(authorId, fields, imageFile = null) {
  const db   = getDatabase();
  const slug = generateSlug(fields.title);

  const imageStored   = imageFile?.filename ?? null;
  const imageOriginal = imageFile?.originalname ? sanitizeName(imageFile.originalname) : null;
  const imageMime     = imageFile?.mimetype ?? null;

  const result = db.prepare(
    `INSERT INTO blog_posts
       (author_id, title, slug, body, is_published,
        wallet_enabled, eth_address, btc_address,
        image_stored, image_original, image_mime)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    authorId,
    fields.title.trim(),
    slug,
    fields.body.trim(),
    fields.is_published ?? 1,
    fields.wallet_enabled ? 1 : 0,
    fields.eth_address?.trim() || null,
    fields.btc_address?.trim() || null,
    imageStored,
    imageOriginal,
    imageMime,
  );

  return db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(result.lastInsertRowid);
}

export function updatePost(postId, authorId, fields, imageFile = null) {
  const db   = getDatabase();
  const post = db.prepare('SELECT * FROM blog_posts WHERE id = ? AND author_id = ?').get(postId, authorId);
  if (!post) { const e = new Error('Not found.'); e.statusCode = 404; throw e; }

  // If a new image is uploaded, delete the old one
  if (imageFile && post.image_stored) {
    try { fs.unlinkSync(path.resolve(env.upload.dir, post.image_stored)); } catch {}
  }

  const imageStored   = imageFile?.filename   ?? post.image_stored;
  const imageOriginal = imageFile?.originalname ? sanitizeName(imageFile.originalname) : post.image_original;
  const imageMime     = imageFile?.mimetype    ?? post.image_mime;

  db.prepare(
    `UPDATE blog_posts SET
       title=?, body=?, is_published=?,
       wallet_enabled=?, eth_address=?, btc_address=?,
       image_stored=?, image_original=?, image_mime=?,
       updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id=?`
  ).run(
    fields.title?.trim()   ?? post.title,
    fields.body?.trim()    ?? post.body,
    fields.is_published    ?? post.is_published,
    fields.wallet_enabled  ?? post.wallet_enabled,
    fields.eth_address?.trim() || null,
    fields.btc_address?.trim() || null,
    imageStored,
    imageOriginal,
    imageMime,
    postId
  );

  return db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(postId);
}

export function deletePost(postId, authorId) {
  const db   = getDatabase();
  const post = db.prepare('SELECT * FROM blog_posts WHERE id = ? AND author_id = ?').get(postId, authorId);
  if (!post) { const e = new Error('Not found.'); e.statusCode = 404; throw e; }

  // Delete image file
  if (post.image_stored) {
    try { fs.unlinkSync(path.resolve(env.upload.dir, post.image_stored)); } catch {}
  }

  db.prepare('DELETE FROM blog_posts WHERE id = ?').run(postId);
}

function sanitizeName(name) {
  return path.basename(name).replace(/[^a-zA-Z0-9._\- ]/g, '_').slice(0, 255);
}
