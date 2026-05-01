import { parseCookies } from './cookies.js';

/**
 * Validates CSRF token from request headers against the session cookie.
 * @param {Request} request The incoming request.
 * @returns {boolean} True if tokens match or CSRF is not required for this request.
 */
export function validateCsrf(request) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookies = parseCookies(cookieHeader);
  const csrfCookie = cookies['csrf'];
  
  // If there is no CSRF cookie set, we assume CSRF protection hasn't been initialized
  // or it's a non-session request. For session-based state changes, this is a failure.
  if (!csrfCookie) return false;

  const csrfHeader = request.headers.get('X-CSRF-Token');
  return csrfHeader === csrfCookie;
}
