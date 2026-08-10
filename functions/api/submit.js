// ============================================================
// Solid Roots — Submit API
// POST /api/submit
// Saves a buyer or seller inquiry to the D1 database.
// ============================================================

const INSERT_QUERY =
    "INSERT INTO inquiries (type, user_id, email, phone, answers) VALUES (?, ?, ?, ?, ?)";

import { secureHeaders, corsHeaders } from '../utils/security.js';
const JSON_HEADERS = {
  "Content-Type": "application/json",
  ...secureHeaders(),
  ...corsHeaders(),
};


import { sanitizeValue, validateSubmitPayload } from '../utils/validate.js';
import { errorResponse } from '../utils/errors.js';
import { parseAllowList, isIpAllowed } from '../utils/allowlist.js';
import { logAudit } from '../utils/audit.js';
import { rateLimit, getClientIp } from '../utils/ratelimit.js';


// Per-IP rate limit for the public submit endpoint
const SUBMIT_RATE_LIMIT = 60;       // 60 requests
const SUBMIT_RATE_WINDOW_SEC = 60;  // per 1 minute

function jsonResponse(body, status = 200, extraHeaders) {
    return new Response(JSON.stringify(body), {
        status,
        headers: extraHeaders ? { ...JSON_HEADERS, ...extraHeaders } : JSON_HEADERS,
    });
}

function extractInquiryFields(data) {
    const { type, email, phone, answers } = data;
    // The branched buy/sell forms don't ask every contact field, so these can be
    // absent. D1 rejects undefined bindings, so normalise before storing.
    return { type, email: email ?? '', phone: phone ?? '', answers: answers ?? {} };
}

async function saveInquiry(env, type, email, phone, answers) {
    await env.DB.prepare(INSERT_QUERY)
        .bind(type, null, email, phone, JSON.stringify(answers))
        .run();
}

export async function onRequestPost(context) {
    const { request, env } = context;

  // Rate limit check for submit API
  const ip = getClientIp(request);
    const submitAllowRaw = env?.ALLOWED_SUBMIT_IPS;
    const submitAllowList = submitAllowRaw ? parseAllowList(submitAllowRaw) : [];
    if (!isIpAllowed(ip, submitAllowList)) {
        await logAudit(env.DB, null, 'submit_forbidden', false, `IP=${ip}`);
        return jsonResponse({ error: 'Forbidden' }, 403);
    }


    const rl = await rateLimit(env.DB, ip, '/api/submit', SUBMIT_RATE_LIMIT, SUBMIT_RATE_WINDOW_SEC);
    if (!rl.allowed) {
        await logAudit(env.DB, null, 'submit_ratelimit', false, `IP=${ip}`);
        return jsonResponse({ error: "Too Many Requests" }, 429,
            { 'Retry-After': String(rl.retryAfter) });
    }

    // A syntax error in the body is the caller's fault, not a server fault —
    // parse it outside the 500 handler so it reports as 400.
    let body;
    try {
        body = await request.json();
    } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    try {
        const sanitized = sanitizeValue(body);
        const validation = validateSubmitPayload(sanitized);
        if (!validation.valid) {
            return jsonResponse({ error: validation.errors[0] }, 400);
        }

        // Normalize type to a consistent value before storage
        sanitized.type = String(sanitized.type).trim().toLowerCase();
        const { type, email, phone, answers } = extractInquiryFields(sanitized);
        await saveInquiry(env, type, email, phone, answers);
        await logAudit(env.DB, null, 'submit', true, `type=${type}`);

        return jsonResponse({ success: true });
    } catch (err) {
        return errorResponse(err, 500, env);
    }
}
