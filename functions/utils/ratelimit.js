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
