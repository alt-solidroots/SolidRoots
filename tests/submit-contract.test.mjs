// Guards the contract between the public form and the submit API.
// A mismatch here silently drops every lead: the form posts type "buy"/"sell",
// and validate.js once only accepted "buyer"/"seller", so /api/submit answered
// 400 for every real submission while the UI still showed a success screen.
import assert from 'assert'
import fs from 'fs'
import path from 'path'

const read = p => fs.readFileSync(path.resolve(p), 'utf8')

// validate.js is ESM but package.json says commonjs, so load it as a data module.
const validateSrc = read('functions/utils/validate.js')
const { validateSubmitPayload } = await import(
  'data:text/javascript,' + encodeURIComponent(validateSrc))

// The values the form actually posts, taken from the form's own config.
const flowConfig = read('public/js/flow-config.js')
const FLOW_TYPE = new Function(`${flowConfig.match(/const FLOW_TYPE = \{[\s\S]*?\};/)[0]} return FLOW_TYPE;`)()
const formTypes = Object.values(FLOW_TYPE)

assert.deepStrictEqual(formTypes.sort(), ['buy', 'sell'], 'form types changed — update the API too')

// Every type the form can post must be accepted.
for (const type of formTypes) {
  const res = validateSubmitPayload({ type, phone: '9876543210', answers: {} })
  assert.ok(res.valid, `/api/submit would reject the form's own type "${type}": ${res.errors[0]}`)
}

// Contact: the branched forms collect a phone but often no email at all.
assert.ok(validateSubmitPayload({ type: 'buy', phone: '9876543210', answers: {} }).valid,
  'phone-only submission must be accepted')
assert.ok(validateSubmitPayload({ type: 'buy', email: 'a@b.com', answers: {} }).valid,
  'email-only submission must be accepted')
assert.ok(!validateSubmitPayload({ type: 'buy', answers: {} }).valid,
  'a submission with no contact details must be rejected')

// Junk must still be refused.
assert.ok(!validateSubmitPayload({ type: 'hacker', phone: '9876543210' }).valid)
assert.ok(!validateSubmitPayload({ phone: '9876543210' }).valid, 'missing type must be rejected')

// submit.js must import everything it calls — a missing errorResponse import
// turned every caught error into a ReferenceError 500.
const submitSrc = read('functions/api/submit.js')
for (const fn of ['errorResponse', 'sanitizeValue', 'validateSubmitPayload', 'logAudit']) {
  if (new RegExp(`\\b${fn}\\s*\\(`).test(submitSrc)) {
    assert.ok(new RegExp(`import\\s*\\{[^}]*\\b${fn}\\b[^}]*\\}`).test(submitSrc),
      `submit.js calls ${fn}() but never imports it`)
  }
}

console.log('submit-contract: all assertions passed')
