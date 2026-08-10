// CF-Connecting-IP is set by the Cloudflare edge and cannot be forged. The
// remaining headers are caller-supplied, so the result is length-capped before
// it becomes a storage key or an audit-log field.
const MAX_IP_LEN = 45; // an IPv6 address at its longest

export function getClientIp(request) {
  const cf = request.headers.get("CF-Connecting-IP");
  if (cf) return cf.slice(0, MAX_IP_LEN);
  const xf = request.headers.get("X-Forwarded-For");
  if (xf) return xf.split(",")[0].trim().slice(0, MAX_IP_LEN);
  const fallback = request.headers.get("X-Real-IP") || request.headers.get("Remote-Addr");
  return fallback ? fallback.slice(0, MAX_IP_LEN) : "unknown";
}

// Fixed-window rate limiter backed by D1.
//
// This replaces two implementations that could not enforce a limit:
//
//   KV: the read-modify-write was not atomic, so concurrent requests each read
//   the same count and each wrote count+1 — only one increment survived. KV
//   reads are also eventually consistent (up to ~60s between locations), so a
//   caller spreading requests across regions saw a stale count. Cloudflare
//   documents KV as unsuitable for counters.
//
//   In-memory Map: one Map per isolate. Cloudflare runs many isolates per
//   deployment, so the real ceiling was the limit multiplied by however many
//   happened to be warm, and the Map only ever reset entries, never evicted
//   them.
//
// D1 is already bound, is strongly consistent, and does the whole
// read-reset-increment in one atomic statement.
//
// ponytail: fixed window, not sliding — a burst straddling a window boundary
// can see up to 2x the limit briefly. Move to a Durable Object if that margin
// ever matters. Edge/WAF rate limiting is the right first line either way.

const CLEANUP_ODDS = 0.01; // ~1 request in 100 also sweeps expired rows

export async function rateLimit(db, ip, path, limit, windowSec) {
  if (!db) return { allowed: true, remaining: limit, retryAfter: 0 };

  const key = `${ip}:${path}`;
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - windowSec;

  try {
    // One statement: insert at 1, or — if the stored window has expired —
    // restart at 1, otherwise increment. Atomic, so no lost updates.
    const row = await db.prepare(
      `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE WHEN rate_limits.window_start <= ? THEN 1
                      ELSE rate_limits.count + 1 END,
         window_start = CASE WHEN rate_limits.window_start <= ? THEN ?
                             ELSE rate_limits.window_start END
       RETURNING count, window_start`
    ).bind(key, now, cutoff, cutoff, now).first();

    const count = row?.count ?? 1;
    const windowStart = row?.window_start ?? now;
    const allowed = count <= limit;

    if (Math.random() < CLEANUP_ODDS) {
      await db.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(cutoff).run();
    }

    return {
      allowed,
      remaining: Math.max(0, limit - count),
      retryAfter: allowed ? 0 : Math.max(1, windowStart + windowSec - now),
    };
  } catch {
    // A counter-store failure must not take the form or the admin panel down.
    // On /api/admin the secret is still the real gate; this only removes the
    // throttle, and admin_unauthorized events remain audited.
    return { allowed: true, remaining: limit, retryAfter: 0 };
  }
}
