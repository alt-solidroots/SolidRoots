Validation Tests (documentation)
Note: These tests are described for manual/CI integration. If you want automated tests, we can wire up a test runner later.

- Admin API Validation
  1. Missing admin secret: point to /api/admin?key=anything; expect 400 (Missing admin key) or 401 depending on flow.
  2. Invalid key format: /api/admin?key=; expect 400 with 'Missing admin key' or similar.
  3. Valid secret but no type query: /api/admin?key=VALID -- expect 200 with data or 401 depending on data store.
  4. Valid secret with invalid key format (special chars): expect 400.

- Submit API Validation
  1. Invalid payload type: POST /api/submit with { type: "foo" } -> 400 (Invalid type)
  2. Missing type: payload {} -> 400 (Missing type)
  3. Invalid email: { type: "buyer", email: "not-an-email" } -> 400 (Invalid email)
  4. Invalid phone: { type: "buyer", email: "a@b.com", phone: "abc" } -> 400 (Invalid phone)
  5. Valid payload: { type: "buyer", email: "a@example.com", phone: "+1 555-1212", answers: { note: "hello" } } -> 200 and sanitized storage
  6. Malicious payload: HTML/JS in strings; ensure storage contains escaped values
