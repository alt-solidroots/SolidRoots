import { hashPassword } from '../utils/password.js';
import { jsonResponse } from './utils.js';
import { errorResponse } from '../utils/errors.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  if (env?.OIDC_ISSUER) {
    return jsonResponse({ error: 'OIDC configured; register via IdP' }, 400);
  }
  try {
    const body = await request.json();
  const userId = body?.user_id;
  const password = body?.password;
  const email = body?.email || '';

    // Server-side input validation
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return jsonResponse({ error: 'Missing user_id' }, 400);
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return jsonResponse({ error: 'Password must be at least 8 characters' }, 400);
    }
    if (email && !/^([^\s@]+)@([^\s@]+)\.[^\s@]+$/.test(email)) {
      return jsonResponse({ error: 'Invalid email' }, 400);
    }
  // Check if user exists
  const existing = await env.DB.prepare('SELECT 1 FROM users WHERE user_id = ?').bind(userId).first();
  if (existing) {
    return jsonResponse({ error: 'User already exists' }, 409);
  }
  const { salt, hash } = await hashPassword(password);
  await env.DB.prepare('INSERT INTO users (user_id, password_hash, password_salt, email) VALUES (?, ?, ?, ?)')
    .bind(userId, hash, salt, email)
    .run();
    return jsonResponse({ success: true, user_id: userId }, 201);
  } catch (err) {
    return errorResponse(err, 500, env);
  }
}
