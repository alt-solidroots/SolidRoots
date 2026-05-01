// ============================================================
// Solid Roots — Admin API
// GET /api/admin?key=YOUR_ADMIN_SECRET
// Protected by ADMIN_SECRET environment variable.
// ============================================================

import { sanitizeValue, validateAdminKey } from '../utils/validate.js';

import { logAudit } from '../utils/audit.js';
import { rateLimitKV } from '../utils/ratelimit.js';
import { errorResponse } from '../utils/errors.js';
import { secureHeaders, corsHeaders } from '../utils/security.js';

import { parseAllowList, isIpAllowed } from '../utils/allowlist.js';

// Rate limiter: prefer KV-based and fallback to in-memory per-instance for admin API.
const RATE_LIMITER_ADMIN = new Map();
const ADMIN_RATE_LIMIT = 20; // max requests
const ADMIN_RATE_WINDOW_MS = 60 * 1000; // per 1 minute

function getClientIp(request) {
  try {
    const cf = request.headers.get("CF-Connecting-IP");
    if (cf) return cf;
    const xf = request.headers.get("X-Forwarded-For");
    if (xf) return xf.split(",")[0].trim();
  } catch (e) {
    // fall through
  }
  return (
    request.headers.get("X-Real-IP") || request.headers.get("Remote-Addr") || "unknown"
  );
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

// Admin key validation handled by shared module (validateAdminKey)
const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_PAGE = 1;
// Removed fallback admin secret. Admin access requires explicit environment-provided secret.

const JSON_HEADERS = {
    "Content-Type": "application/json",
    ...secureHeaders(),
    ...corsHeaders(),
};

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}


function isAuthorized(key, env) {
    const secret = env.ADMIN_SECRET;
    if (!secret) return false;
    return key === secret;
}

function parsePaginationParams(searchParams) {
    let page = parseInt(searchParams.get("page") || DEFAULT_PAGE, 10);
    if (Number.isNaN(page) || page < 1) page = DEFAULT_PAGE;
    let pageSize = parseInt(searchParams.get("pageSize") || DEFAULT_PAGE_SIZE, 10);
    if (Number.isNaN(pageSize) || pageSize < 1) pageSize = DEFAULT_PAGE_SIZE;
    const typeFilter = searchParams.get("type") || "all";
    const offset = (page - 1) * pageSize;
    return { page, pageSize, typeFilter, offset };
}

function buildInquiryQueries(typeFilter, pageSize, offset) {
    const hasFilter = typeFilter !== "all";
    const whereClause = hasFilter ? " WHERE type = ?" : "";
    const filterBindings = hasFilter ? [typeFilter] : [];

    return {
        dataQuery: `SELECT * FROM inquiries${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        dataBindings: [...filterBindings, pageSize, offset],
        countQuery: `SELECT COUNT(*) as total FROM inquiries${whereClause}`,
        countBindings: filterBindings,
    };
}

async function fetchInquiries(env, queries) {
    const { dataQuery, dataBindings, countQuery, countBindings } = queries;

    const [result, countResult] = await Promise.all([
        env.DB.prepare(dataQuery).bind(...dataBindings).all(),
        env.DB.prepare(countQuery).bind(...countBindings).first(),
    ]);

    return { rows: result.results, total: countResult.total };
}

export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const key = sanitizeValue(url.searchParams.get("key") ?? "");

    // Rate limit check for admin API
    const ip = getClientIp(request);
    // Enforce allow-list if configured
    const adminAllowRaw = env?.ALLOWED_ADMIN_IPS;
    const adminAllowList = adminAllowRaw ? parseAllowList(adminAllowRaw) : [];
    if (!isIpAllowed(ip, adminAllowList)) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    if (env.RATE_LIMIT_KV) {
        const rl = await rateLimitKV(env.RATE_LIMIT_KV, ip, '/admin', ADMIN_RATE_LIMIT, Math.ceil(ADMIN_RATE_WINDOW_MS / 1000));
        if (!rl.allowed) {
            return jsonResponse({ error: "Too Many Requests" }, 429);
        }
    } else if (!allowRequestInWindow(RATE_LIMITER_ADMIN, ip, ADMIN_RATE_LIMIT, ADMIN_RATE_WINDOW_MS)) {
        return jsonResponse({ error: "Too Many Requests" }, 429);
    }

    // Validate input before authorization
    const validation = validateAdminKey(key);
    if (!validation.valid) {
        return jsonResponse({ error: validation.errors[0] }, 400);
    }

    if (!isAuthorized(key, env)) {
        await logAudit(env.DB, 'admin', 'admin_unauthorized', false, `IP=${ip}`);
        return jsonResponse({ error: "Unauthorized" }, 401);
    }

    try {
        const { page, pageSize, typeFilter, offset } = parsePaginationParams(url.searchParams);
        const queries = buildInquiryQueries(typeFilter, pageSize, offset);
        const { rows, total } = await fetchInquiries(env, queries);
        // Audit admin access success
        try { await logAudit(env.DB, 'admin', 'admin_access', true, `key=${key}, page=${page}, pageSize=${pageSize}, filter=${typeFilter}`); } catch {}

        return jsonResponse({ data: rows, total, page, pageSize });
  } catch (err) {
        return errorResponse(err, 500, env);
    }
}
