// Endpoint: GET /api/me
// Returns inquiries for the authenticated user via JWT in Authorization header
import { verifyJwt } from '../utils/auth.js';

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

import { errorResponse } from '../utils/errors.js';
export async function onRequestGet(context) {
  const { request, env } = context;
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }
  const token = auth.slice(7);
  const claims = await verifyJwt(token, env.JWT_SECRET);
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
