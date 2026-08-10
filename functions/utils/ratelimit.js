// CF-Connecting-IP is set by the Cloudflare edge and cannot be forged. The
// remaining headers are caller-supplied, so the result is length-capped before
// it becomes a KV key or an audit-log field.
const MAX_IP_LEN = 45; // an IPv6 address at its longest

export function getClientIp(request) {
  const cf = request.headers.get("CF-Connecting-IP");
  if (cf) return cf.slice(0, MAX_IP_LEN);
  const xf = request.headers.get("X-Forwarded-For");
  if (xf) return xf.split(",")[0].trim().slice(0, MAX_IP_LEN);
  const fallback = request.headers.get("X-Real-IP") || request.headers.get("Remote-Addr");
  return fallback ? fallback.slice(0, MAX_IP_LEN) : "unknown";
}

// Per-instance in-memory limiter (fallback when RATE_LIMIT_KV is unbound).
export function allowRequestInWindow(map, key, limit, windowMs) {
  const now = Date.now();
  const rec = map.get(key) || { start: now, count: 0 };
  if (now - rec.start > windowMs) {
    rec.start = now;
    rec.count = 0;
  }
  if (rec.count >= limit) {
    map.set(key, rec);
    return false;
  }
  rec.count += 1;
  map.set(key, rec);
  return true;
}

export async function rateLimitKV(kv, ip, path, limit, windowSec) {
  if (!kv) return { allowed: true, remaining: limit };
  const key = `${ip}:${path}`;
  const now = Math.floor(Date.now() / 1000);
  try {
    const raw = await kv.get(key);
    let rec = raw ? JSON.parse(raw) : null;
    if (!rec) rec = { window: now, count: 0 };
    if (now - rec.window >= windowSec) {
      rec.window = now;
      rec.count = 0;
    }
    if (rec.count >= limit) {
      await kv.put(key, JSON.stringify(rec), { expirationTtl: windowSec });
      return { allowed: false, remaining: 0 };
    }
    rec.count += 1;
    await kv.put(key, JSON.stringify(rec), { expirationTtl: windowSec });
    return { allowed: true, remaining: limit - rec.count };
  } catch {
    // On KV failure, opt to allow traffic to avoid service disruption
    return { allowed: true, remaining: limit };
  }
}
