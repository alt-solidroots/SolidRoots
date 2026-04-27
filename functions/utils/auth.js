// Minimal JWT-like authentication helpers using HS256 (WebCrypto)
// Note: This is a lightweight, in-repo implementation for demonstration. In production, prefer a robust auth service.

// Helpers: base64url encoding/decoding
function toBase64Url(bytes) {
  // bytes: Uint8Array
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(input) {
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binary = typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.split('').map((c) => c.charCodeAt(0)));
  // Return string
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

function encodeHeader() {
  return toBase64Url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
}

async function signData(data, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return toBase64Url(new Uint8Array(sig));
}

export async function signJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = toBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const data = headerB64 + '.' + payloadB64;
  const signature = await signData(data, secret);
  return data + '.' + signature;
}

export async function verifyJwt(token, secret) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;
  const data = headerB64 + '.' + payloadB64;
  try {
    // Recompute signature
    const expected = await signData(data, secret);
    // simple constant-time-ish comparison
    if (signatureB64.length !== expected.length) return null;
    let diff = 0;
    for (let i = 0; i < signatureB64.length; i++) {
      diff |= signatureB64.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    if (diff !== 0) return null;
    // Decode payload
    const payloadJson = fromBase64Url(payloadB64);
    const payload = JSON.parse(payloadJson);
    // Basic checks: expiration, issuer/audience can be added as needed
    const now = Math.floor(Date.now() / 1000);
    if (payload && typeof payload.exp === 'number' && now >= payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
