// Exercises the rate limiter against real SQLite — the engine D1 runs — so the
// atomic-upsert claim is tested, not just asserted. The previous KV and
// in-memory implementations both looked correct and enforced almost nothing.
import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { DatabaseSync } from 'node:sqlite'

const read = p => fs.readFileSync(path.resolve(p), 'utf8')
const { rateLimit, getClientIp } = await import(
  'data:text/javascript,' + encodeURIComponent(read('functions/utils/ratelimit.js')))

// Minimal D1-shaped adapter over node:sqlite.
function makeDb() {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(`CREATE TABLE rate_limits (
    key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, count INTEGER NOT NULL)`)
  return {
    _sqlite: sqlite,
    prepare(sql) {
      const stmt = sqlite.prepare(sql)
      return {
        bind: (...args) => ({
          first: async () => stmt.get(...args) ?? null,
          run: async () => stmt.run(...args),
        }),
      }
    },
  }
}

// ── The limit must actually bind ──
{
  const db = makeDb()
  const results = []
  for (let i = 0; i < 7; i++) results.push(await rateLimit(db, '1.2.3.4', '/api/submit', 5, 60))

  assert.deepStrictEqual(results.map(r => r.allowed),
    [true, true, true, true, true, false, false],
    'exactly `limit` requests pass, the rest are refused')
  assert.strictEqual(results[4].remaining, 0, 'remaining hits 0 on the last allowed request')
  assert.ok(results[5].retryAfter > 0 && results[5].retryAfter <= 60,
    'a refused request reports a sane Retry-After')
}

// ── Counters are per IP and per path, never shared ──
{
  const db = makeDb()
  for (let i = 0; i < 5; i++) await rateLimit(db, '1.1.1.1', '/api/submit', 5, 60)
  assert.strictEqual((await rateLimit(db, '1.1.1.1', '/api/submit', 5, 60)).allowed, false,
    'the exhausted IP is blocked')
  assert.strictEqual((await rateLimit(db, '2.2.2.2', '/api/submit', 5, 60)).allowed, true,
    'a different IP is unaffected')
  assert.strictEqual((await rateLimit(db, '1.1.1.1', '/api/admin', 5, 60)).allowed, true,
    'a different path is unaffected')
}

// ── An expired window resets instead of blocking forever ──
{
  const db = makeDb()
  for (let i = 0; i < 5; i++) await rateLimit(db, '9.9.9.9', '/api/submit', 5, 60)
  assert.strictEqual((await rateLimit(db, '9.9.9.9', '/api/submit', 5, 60)).allowed, false)

  // Age the stored window past the limit rather than sleeping for a minute.
  db._sqlite.exec('UPDATE rate_limits SET window_start = window_start - 120')
  const after = await rateLimit(db, '9.9.9.9', '/api/submit', 5, 60)
  assert.strictEqual(after.allowed, true, 'a new window must let the caller back in')
  assert.strictEqual(after.remaining, 4, 'the new window starts counting from 1')
}

// ── Concurrency: the bug that made the KV version useless ──
// Fired together, every request must still be counted. The old read-modify-write
// let simultaneous callers read the same count and each write count+1, so only
// one increment survived and the limit barely applied.
{
  const db = makeDb()
  const outcomes = await Promise.all(
    Array.from({ length: 20 }, () => rateLimit(db, '5.5.5.5', '/api/submit', 5, 60)))
  assert.strictEqual(outcomes.filter(r => r.allowed).length, 5,
    'exactly 5 of 20 concurrent requests may pass — no lost increments')
}

// ── Failure must not lock anyone out ──
assert.strictEqual((await rateLimit(null, '1.2.3.4', '/x', 5, 60)).allowed, true,
  'no database binding must not block traffic')
{
  const broken = { prepare() { throw new Error('D1 unavailable') } }
  const res = await rateLimit(broken, '1.2.3.4', '/x', 5, 60)
  assert.strictEqual(res.allowed, true, 'a store failure fails open, not closed')
  assert.strictEqual(res.retryAfter, 0)
}

// ── Client IP is taken from the unforgeable header and bounded ──
const hdr = h => ({ headers: { get: n => h[n] ?? null } })
assert.strictEqual(getClientIp(hdr({ 'CF-Connecting-IP': '3.3.3.3', 'X-Forwarded-For': '9.9.9.9' })),
  '3.3.3.3', 'CF-Connecting-IP wins over the spoofable X-Forwarded-For')
assert.strictEqual(getClientIp(hdr({ 'X-Forwarded-For': '4.4.4.4, 5.5.5.5' })), '4.4.4.4')
assert.strictEqual(getClientIp(hdr({})), 'unknown')
assert.ok(getClientIp(hdr({ 'X-Forwarded-For': 'a'.repeat(500) })).length <= 45,
  'a caller-supplied header must not become an unbounded storage key')

// The increment must stay one atomic statement — splitting it back into a read
// then a write is exactly what broke the previous version.
const src = read('functions/utils/ratelimit.js')
assert.ok(/ON CONFLICT\(key\) DO UPDATE SET/.test(src),
  'the counter must be updated by a single upsert')

console.log('ratelimit: all assertions passed')
