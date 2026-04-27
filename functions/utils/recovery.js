// Recovery codes management for MFA


function randomCode(len = 8) {
  const bytes = new Uint8Array(len);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = (Math.random() * 256) | 0;
  }
  // Use hex digits for codes
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, len);
}

export async function generateRecoveryCodes(db, userId, count = 6) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = randomCode(8).toUpperCase();
    codes.push(code);
    await db.prepare('INSERT INTO recovery_codes (user_id, code, used) VALUES (?, ?, 0)').bind(userId, code).run();
  }
  return codes;
}

export async function consumeRecoveryCode(db, userId, code) {
  const row = await db.prepare('SELECT id, used FROM recovery_codes WHERE user_id = ? AND code = ?').bind(userId, code).first();
  if (!row || row.used) return false;
  await db.prepare('UPDATE recovery_codes SET used = 1 WHERE id = ?').bind(row.id).run();
  return true;
}
