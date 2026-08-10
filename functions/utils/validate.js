// Shared input validation and sanitization utilities

// HTML escape to prevent XSS
export function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\//g, '&#x2F;');
}

// Deep enough for the flat answer objects the form sends, shallow enough that a
// hostile payload can't blow the stack through this recursion.
const MAX_DEPTH = 8;

// Trim strings and normalise structure.
//
// This deliberately does NOT HTML-escape. Escaping belongs at the render layer,
// and admin.html already does it correctly (esc(), applied to both keys and
// values). Escaping here as well meant every value was escaped twice, so a
// customer typing "Ram & Sons" was shown "Ram &amp; Sons" in the admin panel.
// Storage keeps the real text; whoever renders it escapes it.
export function sanitizeValue(value, depth = 0) {
  if (value == null) return value;
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    if (depth >= MAX_DEPTH) return null;
    if (Array.isArray(value)) return value.map(v => sanitizeValue(v, depth + 1));
    const out = {};
    for (const k of Object.keys(value)) {
      out[String(k).trim()] = sanitizeValue(value[k], depth + 1);
    }
    return out;
  }
  return value;
}

export function validateAdminKey(key) {
  const errors = [];
  if (typeof key !== 'string' || key.trim() === '') {
    errors.push('Missing admin key');
  } else if (key.length > 128) {
    errors.push('Admin key too long');
  } else if (!/^[A-Za-z0-9._-]+$/.test(key)) {
    errors.push('Admin key has invalid characters');
  }
  return { valid: errors.length === 0, errors };
}

const MAX_EMAIL = 254;   // RFC 5321 maximum
const MAX_PHONE = 32;    // generous room for "+91 (98765) 43210"
const MAX_ANSWERS = 20000; // serialised size; the real form sends well under 2KB

// A phone is only useful if someone can actually ring it. The form asks for a
// 10-digit number, so require that underneath whatever spacing people type —
// "+91 98765 43210", "(98765) 43210" and "9876543210" are all the same number.
// Returns the 10 digits, or null when there isn't a real number in there.
export function normalizePhone(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return null;
}

export function validateSubmitPayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object') {
    errors.push('Invalid payload');
    return { valid: false, errors };
  }

  const t = payload.type ? String(payload.type).trim().toLowerCase() : '';
  if (!t) {
    errors.push('Missing type');
  } else if (!['buy', 'sell'].includes(t)) {
    errors.push('Invalid type');
  }

  const email = payload.email ? String(payload.email).trim() : '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const hasValidEmail = email !== '' && email.length <= MAX_EMAIL && emailRegex.test(email);
  if (email !== '' && !hasValidEmail) {
    errors.push('Invalid email');
  }

  const phone = payload.phone ? String(payload.phone).trim() : '';
  const hasValidPhone = phone !== '' && phone.length <= MAX_PHONE && normalizePhone(phone) !== null;
  if (phone !== '' && !hasValidPhone) {
    errors.push('Invalid phone');
  }

  if (!hasValidEmail && !hasValidPhone) {
    errors.push('Email or phone required');
  }

  if (payload.answers != null) {
    if (typeof payload.answers !== 'object') {
      errors.push('Invalid answers');
    } else if (JSON.stringify(payload.answers).length > MAX_ANSWERS) {
      errors.push('Answers too large');
    }
  }

  return { valid: errors.length === 0, errors };
}
