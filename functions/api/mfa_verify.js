import { parseCookies } from '../utils/cookies.js';
import { getSession, markSessionMfa } from '../utils/sessions.js';
import { jsonResponse } from './utils.js';
import { verifyTotpCode } from '../utils/totp.js';
import { CSP_POLICY } from '../utils/security.js';
import { logAudit } from '../utils/audit.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookies = parseCookies(cookieHeader);
  const sessId = cookies.sessid;
  if (!sessId) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }
  const session = await getSession(env.DB, sessId);
  if (!session || !session.user_id) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }
  const userId = session.user_id;
  const body = await request.json();
  const code = body?.code;
  if (!code) {
    return jsonResponse({ error: 'Missing code' }, 400);
  }
  // Fetch user's MFA secret
  const row = await env.DB.prepare('SELECT mfa_secret FROM users WHERE user_id = ?').bind(userId).first();
  const secret = row?.mfa_secret;
  if (!secret) {
    return jsonResponse({ error: 'MFA not configured' }, 400);
  }
  const ok = await verifyTotpCode(code, secret);
  if (!ok) {
    return jsonResponse({ error: 'Invalid MFA code' }, 401);
  }
  await env.DB.prepare('UPDATE users SET mfa_enabled = 1 WHERE user_id = ?').bind(userId).run();
  await markSessionMfa(env.DB, sessId, true);
  const headers = { 'Content-Type': 'application/json', 'Content-Security-Policy': CSP_POLICY };
  // Audit MFA verify success
  try { await logAudit(env.DB, userId, 'mfa_verify', true, 'MFA verified'); } catch {}
  return new Response(JSON.stringify({ success: true }), { status: 200, headers });
}
