// Simple login endpoint to issue a JWT for a user_id
import { signJwt } from '../utils/auth.js';
import { verifyPassword } from '../utils/password.js';
import { errorResponse } from '../utils/errors.js';
import { jsonResponse } from './utils.js';

// Minimal jsonResponse helper for this endpoint
const JSON_HEADERS = { "Content-Type": "application/json" };
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  // If using a modern IdP (OIDC), login via IdP; local login is disabled to avoid weak auth.
  if (env?.OIDC_ISSUER) {
    return new Response(JSON.stringify({ error: 'OIDC is configured; login via IdP' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
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
      return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    // Use validated fields forward
    // Note: we proceed with the existing flow after the pre-checks

    if (!env.JWT_SECRET) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing user_id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Fetch user password hash and salt
    const row = await env.DB.prepare('SELECT password_hash, password_salt, email FROM users WHERE user_id = ?').bind(userId).first();
    if (!row) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const { password_hash, password_salt, email: storedEmail } = row;
    const ok = await verifyPassword(password, password_salt, password_hash);
    if (!ok) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const now = Math.floor(Date.now() / 1000);
    const payload = { sub: userId, email: storedEmail || email, iat: now, exp: now + 60 * 60 * 24 };
    const token = await signJwt(payload, env.JWT_SECRET);
    return new Response(JSON.stringify({ token }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return errorResponse(err, 500, env);
  }
}
