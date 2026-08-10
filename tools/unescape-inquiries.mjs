/**
 * One-off repair for rows stored while /api/submit HTML-escaped on input.
 *
 * Until validate.js stopped escaping at write time, every value was escaped
 * twice — once on the way in, once by admin.html at render — so "Ram & Sons"
 * reached the admin panel as "Ram &amp; Sons". New rows are stored raw; this
 * decodes the old ones so both read the same.
 *
 * Dry run (prints what would change, touches nothing):
 *   node tools/unescape-inquiries.mjs <db-name>
 * Apply:
 *   node tools/unescape-inquiries.mjs <db-name> --apply
 */

import { execSync } from 'child_process';

const DB_NAME = process.argv[2] || 'solidroots-db';
const APPLY = process.argv.includes('--apply');

// Reverse of the old escape order: &amp; must come last or "&amp;lt;" would
// decode to "<" instead of "&lt;".
function unescapeHtml(s) {
  if (typeof s !== 'string') return s;
  return s
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

const looksEscaped = s =>
  typeof s === 'string' && /&(amp|lt|gt|quot|#39);/.test(s);

function d1(sql) {
  const out = execSync(
    `npx wrangler d1 execute ${DB_NAME} --remote --command="${sql.replace(/"/g, '\\"')}" --json`,
    { stdio: ['inherit', 'pipe', 'pipe'] }
  ).toString();
  return JSON.parse(out)[0].results;
}

const sqlStr = v => `'${String(v).replace(/'/g, "''")}'`;

console.log(`Scanning ${DB_NAME} for double-escaped inquiries...`);
if (!APPLY) console.log('DRY RUN — nothing will be written. Re-run with --apply to commit.\n');

let rows;
try {
  rows = d1('SELECT id, email, phone, answers FROM inquiries');
} catch (e) {
  console.error(`Could not read the database: ${e.message}`);
  console.error('Check that wrangler is logged in and the db name is right.');
  process.exit(1);
}

const updates = [];
for (const row of rows) {
  const email = unescapeHtml(row.email);
  const phone = unescapeHtml(row.phone);

  // answers is JSON whose *values* were escaped before serialising, so decode
  // inside the parsed object rather than across the raw JSON text.
  let answers = row.answers;
  let answersChanged = false;
  try {
    const parsed = JSON.parse(row.answers);
    if (parsed && typeof parsed === 'object') {
      const walk = v => {
        if (typeof v === 'string') return unescapeHtml(v);
        if (Array.isArray(v)) return v.map(walk);
        if (v && typeof v === 'object') {
          return Object.fromEntries(Object.entries(v).map(([k, val]) => [unescapeHtml(k), walk(val)]));
        }
        return v;
      };
      const fixed = JSON.stringify(walk(parsed));
      if (fixed !== row.answers) { answers = fixed; answersChanged = true; }
    }
  } catch {
    // Legacy rows stored plain text rather than JSON — decode as a string.
    if (looksEscaped(row.answers)) { answers = unescapeHtml(row.answers); answersChanged = true; }
  }

  if (email !== row.email || phone !== row.phone || answersChanged) {
    updates.push({ id: row.id, email, phone, answers, before: row });
  }
}

console.log(`${rows.length} rows scanned, ${updates.length} need repair.\n`);

for (const u of updates) {
  const sample = u.before.answers !== u.answers ? ['answers', u.before.answers, u.answers]
    : u.before.email !== u.email ? ['email', u.before.email, u.email]
    : ['phone', u.before.phone, u.phone];
  console.log(`#${u.id} ${sample[0]}:`);
  console.log(`   before: ${String(sample[1]).slice(0, 120)}`);
  console.log(`   after:  ${String(sample[2]).slice(0, 120)}`);
}

if (updates.length === 0) { console.log('Nothing to do.'); process.exit(0); }

if (!APPLY) {
  console.log(`\nDry run complete. Back up first (node tools/backup-db.mjs ${DB_NAME}), then re-run with --apply.`);
  process.exit(0);
}

console.log('\nApplying...');
let done = 0;
for (const u of updates) {
  try {
    d1(`UPDATE inquiries SET email = ${sqlStr(u.email)}, phone = ${sqlStr(u.phone)}, answers = ${sqlStr(u.answers)} WHERE id = ${Number(u.id)}`);
    done++;
  } catch (e) {
    console.error(`  #${u.id} failed: ${e.message}`);
  }
}
console.log(`Repaired ${done}/${updates.length} rows.`);
