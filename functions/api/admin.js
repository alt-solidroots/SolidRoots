// ============================================================
// Solid Roots — Admin API
// GET /api/admin        (Authorization: Bearer YOUR_ADMIN_SECRET)
// DELETE /api/admin?id=123
// Protected by ADMIN_SECRET environment variable. The secret travels in the
// Authorization header, never the URL — query strings land in browser history.
// ============================================================

import { validateAdminKey } from '../utils/validate.js';

import { logAudit } from '../utils/audit.js';
import { rateLimit, getClientIp } from '../utils/ratelimit.js';
import { errorResponse } from '../utils/errors.js';
import { secureHeaders } from '../utils/security.js';

import { parseAllowList, isIpAllowed } from '../utils/allowlist.js';

const ADMIN_RATE_LIMIT = 20;        // max requests
const ADMIN_RATE_WINDOW_SEC = 60;   // per 1 minute

// Admin key validation handled by shared module (validateAdminKey)
const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_PAGE = 1;
const MAX_PAGE_SIZE = 1000; // the admin panel pulls 1000 and paginates client-side
// Removed fallback admin secret. Admin access requires explicit environment-provided secret.

// No CORS headers: the admin panel is served from this same origin, so it needs
// none, and a wildcard would let any site read this data.
const JSON_HEADERS = {
    "Content-Type": "application/json",
    ...secureHeaders(),
};

function jsonResponse(body, status = 200, extraHeaders) {
    return new Response(JSON.stringify(body), {
        status,
        headers: extraHeaders ? { ...JSON_HEADERS, ...extraHeaders } : JSON_HEADERS,
    });
}

// The admin secret arrives as "Authorization: Bearer <secret>".
function readAdminKey(request) {
    const auth = request.headers.get('Authorization') || '';
    return auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
}

function isAuthorized(key, env) {
    const secret = env.ADMIN_SECRET;
    if (!secret) return false;
    // Constant-time compare so a wrong guess can't be narrowed down by timing.
    if (key.length !== secret.length) return false;
    let diff = 0;
    for (let i = 0; i < key.length; i++) {
        diff |= key.charCodeAt(i) ^ secret.charCodeAt(i);
    }
    return diff === 0;
}

function parsePaginationParams(searchParams) {
    let page = parseInt(searchParams.get("page") || DEFAULT_PAGE, 10);
    if (Number.isNaN(page) || page < 1) page = DEFAULT_PAGE;
    let pageSize = parseInt(searchParams.get("pageSize") || DEFAULT_PAGE_SIZE, 10);
    if (Number.isNaN(pageSize) || pageSize < 1) pageSize = DEFAULT_PAGE_SIZE;
    if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;
    // Whitelist rather than trust: anything unrecognised falls back to "all".
    const rawType = searchParams.get("type") || "all";
    const typeFilter = ["buy", "sell", "all"].includes(rawType) ? rawType : "all";
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

// Shared gate for every admin route: allow-list, rate limit, key validation, auth.
// Returns { ok: true, ip } or { ok: false, response } for the caller to return.
async function authorizeAdmin(request, env, key) {
    const ip = getClientIp(request);

    const adminAllowRaw = env?.ALLOWED_ADMIN_IPS;
    const adminAllowList = adminAllowRaw ? parseAllowList(adminAllowRaw) : [];
    if (!isIpAllowed(ip, adminAllowList)) {
        return { ok: false, response: jsonResponse({ error: 'Forbidden' }, 403) };
    }

    const rl = await rateLimit(env.DB, ip, '/api/admin', ADMIN_RATE_LIMIT, ADMIN_RATE_WINDOW_SEC);
    if (!rl.allowed) {
        return {
            ok: false,
            response: jsonResponse({ error: "Too Many Requests" }, 429,
                { 'Retry-After': String(rl.retryAfter) }),
        };
    }

    // Validate input before authorization
    const validation = validateAdminKey(key);
    if (!validation.valid) {
        return { ok: false, response: jsonResponse({ error: validation.errors[0] }, 400) };
    }

    if (!isAuthorized(key, env)) {
        await logAudit(env.DB, 'admin', 'admin_unauthorized', false, `IP=${ip}`);
        return { ok: false, response: jsonResponse({ error: "Unauthorized" }, 401) };
    }

    return { ok: true, ip };
}

export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    const guard = await authorizeAdmin(request, env, readAdminKey(request));
    if (!guard.ok) return guard.response;

    try {
        const { page, pageSize, typeFilter, offset } = parsePaginationParams(url.searchParams);
        const queries = buildInquiryQueries(typeFilter, pageSize, offset);
        const { rows, total } = await fetchInquiries(env, queries);
        // Audit admin access success
        await logAudit(env.DB, 'admin', 'admin_access', true, `page=${page}, pageSize=${pageSize}, filter=${typeFilter}`);

        return jsonResponse({ data: rows, total, page, pageSize });
  } catch (err) {
        return errorResponse(err, 500, env);
    }
}

// DELETE /api/admin?id=123 — removes a single inquiry.
export async function onRequestDelete(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    const guard = await authorizeAdmin(request, env, readAdminKey(request));
    if (!guard.ok) return guard.response;

    const id = Number(url.searchParams.get("id"));
    if (!Number.isInteger(id) || id < 1) {
        return jsonResponse({ error: "Invalid id" }, 400);
    }

    try {
        const result = await env.DB.prepare("DELETE FROM inquiries WHERE id = ?").bind(id).run();
        if ((result.meta?.changes ?? 0) === 0) {
            return jsonResponse({ error: "Not found" }, 404);
        }
        // Deletions are irreversible, so always leave a trail.
        // logAudit never throws — it swallows its own failures.
        await logAudit(env.DB, 'admin', 'admin_delete_inquiry', true, `id=${id}, IP=${guard.ip}`);

        return jsonResponse({ success: true, id });
    } catch (err) {
        return errorResponse(err, 500, env);
    }
}
