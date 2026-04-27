// Simple login endpoint to issue a JWT for a user_id
import { signJwt } from '../utils/auth.js';

// Minimal jsonResponse helper for this endpoint
const JSON_HEADERS = { "Content-Type": "application/json" };
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await request.json();
  const userId = body?.user_id;
  const email = body?.email || '';

  if (!env.JWT_SECRET) {
    return new Response(JSON.stringify({ error: 'Server not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Missing user_id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: userId, email, iat: now, exp: now + 60 * 60 * 24 };
  const token = await signJwt(payload, env.JWT_SECRET);
  return new Response(JSON.stringify({ token }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
