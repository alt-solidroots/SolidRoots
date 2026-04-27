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

function base64UrlToBytes(input) {
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64').buffer);
  }
  throw new Error('No base64 decoder available');
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

export async function verifyJwt(token, env) {
  if (typeof token !== 'string') return null;
  // Support OpenID Connect (OIDC) RS256 with JWKS if configured
  const issuer = env?.OIDC_ISSUER || env?.OIDC_PROVIDER;
  if (issuer) {
    try {
      const headerB64 = token.split('.')[0];
      const header = JSON.parse(fromBase64Url(headerB64));
      if (header?.alg !== 'RS256') return null;
      const kid = header?.kid;
      const jwks = await fetchOIDCJWKS(issuer, env);
      if (!jwks) return null;
      const jwk = (jwks.find ? jwks.find(k => k.kid === kid) : (jwks.keys || []).find(k => k.kid === kid));
      if (!jwk) return null;
      const cryptoKey = await crypto.subtle.importKey('jwk', jwk, {
        name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' }
      }, false, ['verify']);
      const data = new TextEncoder().encode(headerB64 + '.' + token.split('.')[1]);
      const signature = base64UrlToBytes(token.split('.')[2]);
      const ok = await crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, cryptoKey, signature, data);
      if (!ok) return null;
      const payload = JSON.parse(fromBase64Url(token.split('.')[1]));
      // Basic claims checks
      const now = Math.floor(Date.now() / 1000);
      if (payload?.exp && now >= payload.exp) return null;
      if (env.OIDC_ISSUER && payload.iss && payload.iss !== issuer) return null;
      const clientId = env.OIDC_CLIENT_ID;
      if (clientId) {
        if (payload.aud == null) return null;
        if (Array.isArray(payload.aud)) {
          if (!payload.aud.includes(clientId)) return null;
        } else if (payload.aud !== clientId) {
          return null;
        }
      }
      return payload;
    } catch {
      return null;
    }
  }

  // Fallback to HS256 if JWT_SECRET provided
  const secret = env?.JWT_SECRET;
  if (!secret) return null;
  // Reusing existing HS256 verification with shared secret
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;
  const data = headerB64 + '.' + payloadB64;
  try {
    const expected = await signData(data, secret);
    if (signatureB64.length !== expected.length) return null;
    let diff = 0;
    for (let i = 0; i < signatureB64.length; i++) {
      diff |= signatureB64.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    if (diff !== 0) return null;
    const payloadJson = fromBase64Url(payloadB64);
    const payload = JSON.parse(payloadJson);
    const now = Math.floor(Date.now() / 1000);
    if (payload?.exp && now >= payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// Helpers for OIDC path
let _oidcKeysCache = null;
let _oidcLastFetch = 0;
async function fetchOIDCJWKS(issuer, env) {
  try {
    const url = env.OIDC_JWKS_URL ? env.OIDC_JWKS_URL : `${issuer.replace(/\/$/, '')}/.well-known/jwks.json`;
    const now = Date.now();
    if (!_oidcKeysCache || now - _oidcLastFetch > 10 * 60 * 1000) {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      _oidcKeysCache = data.keys ? data.keys : data;
      _oidcLastFetch = now;
    }
    return _oidcKeysCache;
  } catch {
    return null;
  }
}
