/**
 * src/services/api.js
 *
 * Centralized API client.
 *
 * WHY fetch with credentials: 'include':
 *  - Required for HTTP-only cookies to be sent with cross-origin requests
 *  - Vite proxy makes requests same-origin in dev; this is still needed in prod
 *
 * WHY automatic token refresh:
 *  - Access tokens expire in 15 min (short-lived = good)
 *  - Transparent refresh means users aren't kicked out unexpectedly
 *  - Only one refresh attempt per failed request to avoid infinite loops
 */

const BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const config = {
    credentials: 'include', // Always send cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  let response = await fetch(`${BASE_URL}${endpoint}`, config);

  // Transparent token refresh on 401
  if (response.status === 401 && !options._retried) {
    const refreshed = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (refreshed.ok) {
      // Retry the original request once
      return request(endpoint, { ...options, _retried: true });
    } else {
      // Refresh failed — user must log in again
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
  }

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

export const api = {
  get:    (endpoint, options) =>
    request(endpoint, { method: 'GET', ...options }),

  post:   (endpoint, body, options) =>
    request(endpoint, { method: 'POST', body: JSON.stringify(body), ...options }),

  put:    (endpoint, body, options) =>
    request(endpoint, { method: 'PUT', body: JSON.stringify(body), ...options }),

  patch:  (endpoint, body, options) =>
    request(endpoint, { method: 'PATCH', body: JSON.stringify(body), ...options }),

  delete: (endpoint, options) =>
    request(endpoint, { method: 'DELETE', ...options }),

  /** For multipart/form-data (file uploads) — do NOT set Content-Type, browser sets it */
  upload: (endpoint, formData, options) =>
    request(endpoint, {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set multipart boundary
      ...options,
    }),
};
