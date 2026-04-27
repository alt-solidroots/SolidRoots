// Password hashing helpers using WebCrypto PBKDF2 (strong, salt-based)

function toHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  const len = hex.length;
  const bytes = new Uint8Array(len / 2);
  for (let i = 0; i < len; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function getSaltBytes() {
  const arr = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    // Fallback for environments without crypto RNG
    for (let i = 0; i < arr.length; i++) arr[i] = (Math.random() * 256) | 0;
  }
  return arr;
}

async function hashPasswordRaw(password, saltBytes) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return toHex(new Uint8Array(bits));
}

export async function hashPassword(password) {
  const saltBytes = getSaltBytes();
  const hashHex = await hashPasswordRaw(password, saltBytes);
  const saltHex = toHex(saltBytes);
  return { salt: saltHex, hash: hashHex };
}

export async function verifyPassword(password, saltHex, hashHex) {
  const saltBytes = hexToBytes(saltHex);
  const computedHash = await hashPasswordRaw(password, saltBytes);
  // constant-time compare-ish
  if (computedHash.length !== hashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < computedHash.length; i++) {
    diff |= computedHash.charCodeAt(i) ^ hashHex.charCodeAt(i);
  }
  return diff === 0;
}
