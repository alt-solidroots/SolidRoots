export async function logAudit(db, userId, action, success, details) {
  try {
    await db.prepare('INSERT INTO audits (user_id, action, timestamp, success, details) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)')
      .bind(userId, action, success ? 1 : 0, details || null)
      .run();
  } catch {
    // Never throw audit failures to avoid breaking main flow
  }
}
