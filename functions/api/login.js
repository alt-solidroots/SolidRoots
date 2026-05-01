// Simple login endpoint to issue a JWT for a user_id
import { signJwt } from '../utils/auth.js';
import { logAudit } from '../utils/audit.js';
import { verifyPassword } from '../utils/password.js';
import { errorResponse } from '../utils/errors.js';
import { createSession } from '../utils/sessions.js';
import { secureHeaders, corsHeaders } from '../utils/security.js';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  ...secureHeaders(),
  ...corsHeaders(),
};


export async function onRequestPost(context) {
  const { request, env } = context;
  // If using a modern IdP (OIDC), login via IdP; local login is disabled to avoid weak auth.
  if (env?.OIDC_ISSUER) {
    return new Response(JSON.stringify({ error: 'OIDC is configured; login via IdP' }), { status: 400, headers: JSON_HEADERS });
  }

  // Server-side input validation
  try {
    const body = await request.json();
    const userId = body?.user_id;
    const password = body?.password || '';
    const email = body?.email || '';

    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return new Response(JSON.stringify({ error: 'Missing user_id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (email && !/^([^\s@]+)@([^\s@]+)\.[^\s@]+$/.test(email)) {
      // Keep optional email validation strict
      return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400, headers: JSON_HEADERS });
    }

    // Use validated fields forward
    // Note: we proceed with the existing flow after the pre-checks

    if (!env.JWT_SECRET) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing user_id' }), { status: 400, headers: JSON_HEADERS });
    }


    // Fetch user password hash and salt
    const row = await env.DB.prepare('SELECT password_hash, password_salt, email FROM users WHERE user_id = ?').bind(userId).first();
    if (!row) {
      await logAudit(env.DB, userId, 'login_failed', false, 'user not found');
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 400, headers: JSON_HEADERS });
    }

    const { password_hash, password_salt, email: storedEmail } = row;
    const ok = await verifyPassword(password, password_salt, password_hash);
    if (!ok) {
      await logAudit(env.DB, userId, 'login_failed', false, 'invalid credentials');
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers: JSON_HEADERS });
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = { sub: userId, email: storedEmail || email, iat: now, exp: now + 60 * 60 * 24 };
    const token = await signJwt(payload, env.JWT_SECRET);
    // Create a short-lived session and set secure cookies (sessid + CSRF)
    try {
      const sess = await createSession(env.DB, userId, 1800);
      const remaining = Math.max(0, Math.floor((new Date(sess.expiresAt).getTime() - Date.now()) / 1000));
      const cookieSess = `sessid=${sess.sessionId}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${remaining}`;
      const cookieCsrf = `csrf=${sess.csrfToken}; Path=/; Secure; SameSite=Strict; Max-Age=${remaining}`;
      const headers = new Headers();
      headers.set('Content-Type','application/json');
      Object.entries(secureHeaders()).forEach(([k,v]) => headers.set(k, v));
      Object.entries(corsHeaders()).forEach(([k,v]) => headers.set(k, v));
      headers.append('Set-Cookie', cookieSess);
      headers.append('Set-Cookie', cookieCsrf);

      // Audit login success
      try { await logAudit(env.DB, userId, 'login', true, 'session created'); } catch {}
      return new Response(JSON.stringify({ token }), { status: 200, headers: Object.fromEntries(headers.entries()) });
    } catch {
      // Fallback: still return token without session cookies
      const headers = { 'Content-Type': 'application/json' };
      return new Response(JSON.stringify({ token }), { status: 200, headers });
    }
  } catch (err) {
    return errorResponse(err, 500, env);
  }
}
