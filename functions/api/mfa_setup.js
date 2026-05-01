import { parseCookies } from '../utils/cookies.js';
import { getSession } from '../utils/sessions.js';
import { generateSecret } from '../utils/totp.js';
import { logAudit } from '../utils/audit.js';
import { CSP_POLICY } from '../utils/security.js';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Content-Security-Policy': CSP_POLICY,
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  // Authenticate user via session for setup
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

  // Generate MFA secret and store it
  const secret = await generateSecret();
  try {
    await env.DB.prepare('UPDATE users SET mfa_secret = ?, mfa_enabled = 0 WHERE user_id = ?').bind(secret, userId).run();
  } catch {
    // ignore DB errors, but raise 500
    return jsonResponse({ error: 'Failed to setup MFA' }, 500);
  }
  const otpauth = `otpauth://totp Solid Roots:${userId}?secret=${secret}&issuer=Solid Roots`;
  // Audit MFA setup
  try { await logAudit(env.DB, userId, 'mfa_setup', true, 'secret generated'); } catch {}
  return jsonResponse({ secret, otpauth_url: otpauth }, 200);
}
