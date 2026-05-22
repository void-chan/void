/**
 * src/middleware/anonymousSession.js
 *
 * Assigns a persistent anonymous identity to every visitor via a UUID cookie.
 *
 * WHY not HTTP-only here:
 *  - The anon ID is NOT a credential — it's just a display identifier
 *  - Frontend needs to read it to display the user's own handle
 *  - Real auth tokens remain HTTP-only
 *
 * Session format: Cookie stores raw UUID
 * Display handle: ANON_[first 6 chars of UUID uppercase]
 */

import { v4 as uuidv4 } from 'uuid';

const COOKIE_NAME = 'anon_id';
const MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

export function anonymousSession(req, res, next) {
  let anonId = req.cookies?.[COOKIE_NAME];

  // Validate: must be a UUID-shaped string
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!anonId || !isValidUUID.test(anonId)) {
    anonId = uuidv4();
    res.cookie(COOKIE_NAME, anonId, {
      httpOnly: false,  // Frontend needs to read for display
      secure: false,    // Set true in prod
      sameSite: 'strict',
      maxAge: MAX_AGE,
      path: '/',
    });
  }

  req.anonId     = anonId;
  req.anonHandle = `ANON_${anonId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
  next();
}
