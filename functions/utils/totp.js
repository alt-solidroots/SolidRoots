// Simple TOTP (RFC 6238) implementation using base32 secrets and HOTP/HMAC-SHA1

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(base32) {
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/[^A-Z2-7]/g, '');
  const bytes = [];
  let buffer = 0;
  let bitsLeft = 0;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const val = BASE32_ALPHABET.indexOf(ch);
    if (val < 0) continue;
    buffer = (buffer << 5) | val;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      bytes.push((buffer >> (bitsLeft - 8)) & 0xff);
      bitsLeft -= 8;
    }
  }
  return new Uint8Array(bytes);
}

function toBytesBE(n) {
  // 8-byte big-endian
  const arr = new Uint8Array(8);
  let v = BigInt(n);
  for (let i = 7; i >= 0; i--) {
    arr[i] = Number(v & 0xffn);
    v = v >> 8n;
  }
  return arr;
}

async function hmacSHA1(keyBytes, dataBytes) {
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', cryptoKey, dataBytes);
  return new Uint8Array(digest);
}

export async function generateSecret(secretBytes = 16) {
  const arr = new Uint8Array(secretBytes);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(arr);
  // encode as base32
  return encodeBase32(arr);
}

function encodeBase32(bytes) {
  const alphabet = BASE32_ALPHABET;
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  while (output.length % 8 !== 0) output += '=';
  return output;
}

export async function generateTotpCode(secretBase32, timeMs = Date.now(), digits = 6, step = 30) {
  const key = base32Decode(secretBase32);
  const t = Math.floor(timeMs / 1000 / step);
  const counterBytes = toBytesBE(t);
  const hmac = await hmacSHA1(key, counterBytes);
  const offset = hmac[hmac.length - 1] & 0x0f;
  let binary = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) >>> 0;
  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, '0');
}

export async function verifyTotpCode(code, secretBase32, timeMs = Date.now(), digits = 6, step = 30, drift = 1) {
  const target = String(code).padStart(digits, '0');
  for (let i = -drift; i <= drift; i++) {
    const t = timeMs / 1000 + i * step;
    const cand = await generateTotpCode(secretBase32, t * 1000, digits, step);
    if (cand === target) return true;
  }
  return false;
}
