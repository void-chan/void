/** src/controllers/blogController.js */
import { listPosts, getPost, createPost, updatePost, deletePost } from '../services/blogService.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';

export function list(req, res, next) {
  try {
    return sendSuccess(res, { posts: listPosts(req.user?.role === 'admin') });
  } catch (err) { next(err); }
}

export function show(req, res, next) {
  try {
    const isAdmin = req.user?.role === 'admin';
    return sendSuccess(res, { post: getPost(req.params.slug, isAdmin) });
  } catch (err) { next(err); }
}

export function create(req, res, next) {
  try {
    const { title, body: postBody, is_published, wallet_enabled, eth_address, btc_address } = req.body;
    const post = createPost(
      req.user.id,
      { title, body: postBody, is_published, wallet_enabled: wallet_enabled === 'true' || wallet_enabled === '1', eth_address, btc_address },
      req.file ?? null
    );
    return sendCreated(res, { post });
  } catch (err) { next(err); }
}

export function update(req, res, next) {
  try {
    const { title, body: postBody, is_published, wallet_enabled, eth_address, btc_address } = req.body;
    return sendSuccess(res, {
      post: updatePost(Number(req.params.id), req.user.id, {
        title, body: postBody, is_published, wallet_enabled, eth_address, btc_address,
      }, req.file ?? null),
    });
  } catch (err) { next(err); }
}

export function remove(req, res, next) {
  try {
    deletePost(Number(req.params.id), req.user.id);
    return sendSuccess(res, { message: 'Post deleted.' });
  } catch (err) { next(err); }
}
