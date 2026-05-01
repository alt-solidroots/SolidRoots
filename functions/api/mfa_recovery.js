import { parseCookies } from '../utils/cookies.js';
import { getSession, markSessionMfa } from '../utils/sessions.js';
import { logAudit } from '../utils/audit.js';
import { secureHeaders, corsHeaders } from '../utils/security.js';

const JSON_HEADERS = {
  "Content-Type": "application/json",
  ...secureHeaders(),
  ...corsHeaders(),
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}
import { consumeRecoveryCode } from '../utils/recovery.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookies = parseCookies(cookieHeader);
  const sessId = cookies.sessid;
  if (!sessId) return jsonResponse({ error: 'Unauthorized' }, 401);
  const session = await getSession(env.DB, sessId);
  if (!session || !session.user_id) return jsonResponse({ error: 'Unauthorized' }, 401);
  const userId = session.user_id;
  const body = await request.json();
  const code = body?.code;
  if (!code) return jsonResponse({ error: 'Missing code' }, 400);
  const ok = await consumeRecoveryCode(env.DB, userId, code);
  if (!ok) {
    await logAudit(env.DB, userId, 'mfa_recovery_failed', false, 'invalid or used code');
    return jsonResponse({ error: 'Invalid or used recovery code' }, 400);
  }

  // If recovery code used, consider MFA passed for this session
  try { await markSessionMfa(env.DB, sessId, true); } catch {}
  await logAudit(env.DB, userId, 'mfa_recovery_success', true, 'recovery code used');
  return jsonResponse({ success: true }, 200);

}
