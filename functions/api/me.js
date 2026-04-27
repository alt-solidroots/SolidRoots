// Endpoint: GET /api/me
// Returns inquiries for the authenticated user via JWT in Authorization header
import { verifyJwt } from '../utils/auth.js';
import { CSP_POLICY } from '../utils/security.js';
import { parseCookies } from '../utils/cookies.js';
import { logAudit } from '../utils/audit.js';
import { getSession } from '../utils/sessions.js';

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Content-Security-Policy": CSP_POLICY,
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

import { errorResponse } from '../utils/errors.js';
export async function onRequestGet(context) {
  const { request, env } = context;
  // Try cookie-based session first
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookies = parseCookies(cookieHeader);
  const sessId = cookies['sessid'];
  if (sessId) {
    const session = await getSession(env.DB, sessId);
    if (session && session.user_id) {
      const userId = session.user_id;
      // MFA gating: if MFA is enabled for user and session hasn't passed MFA, forbid
      const userRow = await env.DB.prepare('SELECT mfa_enabled, mfa_secret FROM users WHERE user_id = ?').bind(userId).first();
      const mfaEnabled = userRow?.mfa_enabled ? 1 : 0;
      const mfaPassed = session.mfa_passed ? 1 : 0;
      if (mfaEnabled && !mfaPassed) {
        return jsonResponse({ error: 'MFA required' }, 403);
      }
      // CSRF check
      const csrfHeader = request.headers.get('X-CSRF-Token') || '';
      const csrfCookie = cookies['csrf'] || '';
      if (csrfCookie && csrfHeader !== csrfCookie) {
        return jsonResponse({ error: 'CSRF token mismatch' }, 403);
      }
      // use userId from session
      try {
        const dataQuery = 'SELECT * FROM inquiries WHERE user_id = ? ORDER BY created_at DESC';
        const rows = await env.DB.prepare(dataQuery).bind(userId).all();
        await logAudit(env.DB, userId, 'view_me', true, 'me endpoint');
        return jsonResponse({ data: rows.results }, 200);
      } catch (err) {
        return errorResponse(err, 500, env);
      }
    }
  }

  // Fallback to JWT-based authentication
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }
  const token = auth.slice(7);
  const claims = await verifyJwt(token, env);
  if (!claims || !claims.sub) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }
  const userId = claims.sub;
  try {
    const dataQuery = 'SELECT * FROM inquiries WHERE user_id = ? ORDER BY created_at DESC';
    const rows = await env.DB.prepare(dataQuery).bind(userId).all();
    return jsonResponse({ data: rows.results }, 200);
  } catch (err) {
    return errorResponse(err, 500, env);
  }
}
