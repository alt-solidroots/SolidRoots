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

// Recursively sanitize values (strings escaped, objects processed)
export function sanitizeValue(value) {
  if (value == null) return value;
  if (typeof value === 'string') {
    return value.trim()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  if (typeof value === 'object') {
    if (Array.isArray(value)) return value.map(v => sanitizeValue(v));
    const out = {};
    for (const k of Object.keys(value)) {
      out[k] = sanitizeValue(value[k]);
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

export function validateSubmitPayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object') {
    errors.push('Invalid payload');
    return { valid: false, errors };
  }

  const t = payload.type ? String(payload.type).trim().toLowerCase() : '';
  if (!t) {
    errors.push('Missing type');
  } else if (!['buyer', 'seller'].includes(t)) {
    errors.push('Invalid type');
  }

  const email = payload.email ? String(payload.email).trim() : '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push('Invalid email');
  }

  const phone = payload.phone;
  if (phone != null && typeof phone === 'string' && phone.trim() !== '') {
    if (!/^[\d\s+\-()]+$/.test(phone)) {
      errors.push('Invalid phone');
    }
  }

  if (payload.answers != null && typeof payload.answers !== 'object') {
    errors.push('Invalid answers');
  }

  return { valid: errors.length === 0, errors };
}
