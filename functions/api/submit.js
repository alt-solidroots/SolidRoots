// ============================================================
// Solid Roots — Submit API
// POST /api/submit
// Saves a buyer or seller inquiry to the D1 database.
// ============================================================

const INSERT_QUERY =
    "INSERT INTO inquiries (type, user_id, email, phone, answers) VALUES (?, ?, ?, ?, ?)";

const JSON_HEADERS = { "Content-Type": "application/json" };

import { sanitizeValue, validateSubmitPayload } from '../utils/validate.js';
import { verifyJwt } from '../utils/auth.js';
import { parseAllowList, isIpAllowed } from '../utils/allowlist.js';
import { rateLimitKV } from '../utils/ratelimit.js';

// Lightweight per-IP rate limiter for submit endpoint
const RATE_LIMITER_SUBMIT = new Map();
const SUBMIT_RATE_LIMIT = 60; // 60 requests
const SUBMIT_RATE_WINDOW_MS = 60 * 1000; // per 1 minute

function getClientIp(req) {
  try {
    const cf = req.headers.get("CF-Connecting-IP");
    if (cf) return cf;
    const xf = req.headers.get("X-Forwarded-For");
    if (xf) return xf.split(",")[0].trim();
  } catch (e) {
    // ignore
  }
  return (req.headers.get("X-Real-IP") || req.headers.get("Remote-Addr") || "unknown");
}

function allowRequestInWindow(map, key, limit, windowMs) {
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

// Sanitization handled by shared module (sanitizeValue)

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function extractInquiryFields(data) {
    const { type, email, phone, answers } = data;
    return { type, email, phone, answers };
}

async function saveInquiry(env, type, userId, email, phone, answers) {
    await env.DB.prepare(INSERT_QUERY)
        .bind(type, userId, email, phone, JSON.stringify(answers))
        .run();
}

// Validation logic centralized in utilities (validateSubmitPayload)

export async function onRequestPost(context) {
    const { request, env } = context;

    // Rate limit check for submit API
    const ip = getClientIp(request);
    const submitAllowRaw = env?.ALLOWED_SUBMIT_IPS;
    const submitAllowList = submitAllowRaw ? parseAllowList(submitAllowRaw) : [];
    if (!isIpAllowed(ip, submitAllowList)) {
        return jsonResponse({ error: 'Forbidden' }, 403);
    }
    if (env.RATE_LIMIT_KV) {
        const rl = await rateLimitKV(env.RATE_LIMIT_KV, ip, '/api/submit', SUBMIT_RATE_LIMIT, Math.ceil(SUBMIT_RATE_WINDOW_MS / 1000));
        if (!rl.allowed) {
            return jsonResponse({ error: "Too Many Requests" }, 429);
        }
    } else if (!allowRequestInWindow(RATE_LIMITER_SUBMIT, ip, SUBMIT_RATE_LIMIT, SUBMIT_RATE_WINDOW_MS)) {
        return jsonResponse({ error: "Too Many Requests" }, 429);
    }

    // JWT auth check
    const auth = request.headers.get('Authorization') || '';
    if (!auth.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    const token = auth.slice(7);
    const claims = await verifyJwt(token, env.JWT_SECRET);
    if (!claims || !claims.sub) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    const jwtUserId = claims.sub;

    try {
        const body = await request.json();
        const sanitized = sanitizeValue(body);
        const validation = validateSubmitPayload(sanitized);
        if (!validation.valid) {
            return jsonResponse({ error: validation.errors[0] }, 400);
        }

        // Normalize type to a consistent value before storage
        sanitized.type = String(sanitized.type).trim().toLowerCase();
        // Use JWT user id for ownership
        const { type, email, phone, answers } = extractInquiryFields(sanitized);
        await saveInquiry(env, type, jwtUserId, email, phone, answers);

        return jsonResponse({ success: true });
    } catch (err) {
        return errorResponse(err, 500, env);
    }
}
