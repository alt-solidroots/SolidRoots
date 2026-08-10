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
  The API accepts type "buy" or "sell" — the values the form posts. "buyer"/"seller" are rejected.
  1. Invalid payload type: POST /api/submit with { type: "foo" } -> 400 (Invalid type)
  2. Missing type: payload {} -> 400 (Missing type)
  3. Invalid email: { type: "buy", email: "not-an-email" } -> 400 (Invalid email)
  4. Invalid phone: { type: "buy", email: "a@b.com", phone: "abc" } -> 400 (Invalid phone)
  5. Unreachable phone: { type: "buy", phone: "+++++" } -> 400 (Invalid phone) — a contact must
     hold a real 10-digit number, so punctuation alone no longer satisfies "email or phone required".
  6. Valid payload: { type: "buy", email: "a@example.com", phone: "9876543210", answers: { note: "hello" } } -> 200
  7. Malformed JSON body -> 400 (Invalid JSON body), not 500.
  8. Oversized input: an answer over 2000 chars, or over 60 answers -> 400.
  9. Storage fidelity: submit a name containing & ' " < > and confirm the admin panel displays it
     exactly as typed. Values are stored raw and escaped only at render, so entities such as
     &amp; appearing on screen mean something is escaping twice.
