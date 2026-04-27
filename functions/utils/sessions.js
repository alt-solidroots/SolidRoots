// Simple server-side session management using a DB table (sessions)
function generateSessionId() {
  // 32-byte hex id
  const buf = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < buf.length; i++) buf[i] = (Math.random() * 256) | 0;
  }
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateCsrfToken() {
  const arr = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i++) arr[i] = (Math.random() * 256) | 0;
  }
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function createSession(db, userId, expiresInSec = 1800) {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();
  const csrfToken = generateCsrfToken();
  await db.prepare('INSERT INTO sessions (session_id, user_id, expires_at, csrf_token) VALUES (?, ?, ?, ?)')
    .bind(sessionId, userId, expiresAt, csrfToken)
    .run();
  return { sessionId, expiresAt, csrfToken };
}

export async function getSession(db, sessionId) {
  if (!sessionId) return null;
  const row = await db.prepare('SELECT * FROM sessions WHERE session_id = ?').bind(sessionId).first();
  if (!row) return null;
  const expiresAt = new Date(row.expires_at).getTime();
  if (Date.now() > expiresAt) return null;
  return row;
}

export async function markSessionMfa(db, sessionId, passed) {
  const val = passed ? 1 : 0;
  await db.prepare('UPDATE sessions SET mfa_passed = ? WHERE session_id = ?').bind(val, sessionId).run();
}
