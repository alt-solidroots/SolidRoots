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
import { rateLimitKV, getClientIp, allowRequestInWindow } from '../utils/ratelimit.js';


// Lightweight per-IP rate limiter for submit endpoint
const RATE_LIMITER_SUBMIT = new Map();
const SUBMIT_RATE_LIMIT = 60; // 60 requests
const SUBMIT_RATE_WINDOW_MS = 60 * 1000; // per 1 minute

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
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


    if (env.RATE_LIMIT_KV) {
        const rl = await rateLimitKV(env.RATE_LIMIT_KV, ip, '/api/submit', SUBMIT_RATE_LIMIT, Math.ceil(SUBMIT_RATE_WINDOW_MS / 1000));
        if (!rl.allowed) {
            await logAudit(env.DB, null, 'submit_ratelimit', false, `IP=${ip}`);
            return jsonResponse({ error: "Too Many Requests" }, 429);
        }
    } else if (!allowRequestInWindow(RATE_LIMITER_SUBMIT, ip, SUBMIT_RATE_LIMIT, SUBMIT_RATE_WINDOW_MS)) {
        await logAudit(env.DB, null, 'submit_ratelimit', false, `IP=${ip}`);
        return jsonResponse({ error: "Too Many Requests" }, 429);
    }

    try {
        const body = await request.json();
        const sanitized = sanitizeValue(body);
        const validation = validateSubmitPayload(sanitized);
        if (!validation.valid) {
            return jsonResponse({ error: validation.errors[0] }, 400);
        }

        // Normalize type to a consistent value before storage
        sanitized.type = String(sanitized.type).trim().toLowerCase();
        const { type, email, phone, answers } = extractInquiryFields(sanitized);
        await saveInquiry(env, type, email, phone, answers);
        try { await logAudit(env.DB, null, 'submit', true, `type=${type}`); } catch {}

        return jsonResponse({ success: true });
    } catch (err) {
        return errorResponse(err, 500, env);
    }
}
