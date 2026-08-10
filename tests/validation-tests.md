Validation Tests (documentation)
Note: These tests are described for manual/CI integration. If you want automated tests, we can wire up a test runner later.

- Admin API Validation
  The secret is sent as `Authorization: Bearer <secret>`, never as a query parameter.
  1. No Authorization header: GET /api/admin -- expect 400 (Missing admin key).
  2. Empty bearer value: `Authorization: Bearer ` -- expect 400 (Missing admin key).
  3. Wrong secret: `Authorization: Bearer wrong-secret` -- expect 401 (Unauthorized).
  4. Secret with invalid characters (e.g. `Bearer a b$c`): expect 400 (Admin key has invalid characters).
  5. Valid secret: `Authorization: Bearer VALID` -- expect 200 with data.
  6. Confirm the response carries no Access-Control-Allow-Origin header (admin data must not be cross-origin readable).

- Submit API Validation
  1. Invalid payload type: POST /api/submit with { type: "foo" } -> 400 (Invalid type)
  2. Missing type: payload {} -> 400 (Missing type)
  3. Invalid email: { type: "buyer", email: "not-an-email" } -> 400 (Invalid email)
  4. Invalid phone: { type: "buyer", email: "a@b.com", phone: "abc" } -> 400 (Invalid phone)
  5. Valid payload: { type: "buyer", email: "a@example.com", phone: "+1 555-1212", answers: { note: "hello" } } -> 200 and sanitized storage
  6. Malicious payload: HTML/JS in strings; ensure storage contains escaped values
