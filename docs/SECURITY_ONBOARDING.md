# Security Onboarding Guide

This document helps new contributors understand how this project handles security, access control, and operational onboarding.

Overview
- The app now enforces strong access controls and injection-resistant behavior:
  - Admin endpoints require a server-side secret (no client-trusted checks).
  - Per-user data is protected via a JWT-based authentication flow; data is tied to user_id in the database.
  - Inputs are validated and sanitized before being stored.
  - Rate limiting is implemented for sensitive routes, with KV-based distribution when configured.
- Password storage uses salted hashing (PBKDF2-based) with a salt per user.
- This guide provides steps to set up, run, and validate security-related features in a local/dev environment and in production.

Prerequisites
- Node.js 18+ (for test harness and tooling)
- Access to your hosting platform (Cloudflare Workers) or a local dev environment compatible with the patch
- A database available to the app (the repository uses a D1-like interface; for local testing a SQLite-like mock can be used)
- Familiarity with environment variables:
  - JWT_SECRET: secret for signing/verifying JWTs
  - ADMIN_SECRET: secret for admin endpoints
  - RATE_LIMIT_KV: optional; KV namespace binding for distributed rate limiting

Environment setup
- Create a new environment/config for development:
  - SECRET values should never be committed; use an environment manager or .env.local
  - Example secrets (do not commit):
    - JWT_SECRET=your-very-secret-for-dev
    - ADMIN_SECRET=your-admin-secret-for-dev

Database schema (high level)
- Inquiries table now supports per-user ownership:
  - user_id: text field storing the user identifier for the inquiry
- A new users table is introduced to store per-user credentials securely (password hash and salt)
- If you’re running locally, ensure migrations are run to create these tables:
  - schema.sql contains the CREATE statements for inquiries and users tables

Local development workflow
- Install dependencies: npm install
- Run tests: npm test
- Run integration tests (note: the test harness is lightweight and uses a minimal in-repo DB mock):
  - The tests exercise login, per-user data fetch, and per-user submit flows
- Start local emulation (if your environment supports wrangler or a similar tool), otherwise use the existing test harness

Authentication and authorization
- /api/register: create a user with a salted password hash (password storage uses PBKDF2 with salt)
- /api/login: issue a JWT (payload includes sub = user_id, iat, exp)
- /api/submit: requires Authorization: Bearer <token>, stores the owner as sub (user_id)
- /api/me: returns only inquiries for the authenticated user
- Admin routes: still protected by ADMIN_SECRET in the environment, with rate limiting

Security testing guidance (manual checks)
- Verify that plaintext passwords are never stored: inspect the users table to ensure password_hash and password_salt exist, not raw passwords.
- Validate password hashing: store a password, login, and confirm token is issued only with correct password.
- Validate per-user data isolation: login as user A, fetch /api/me and ensure only A’s data is returned; login as user B and ensure only B’s data is visible.
- Validate injection resistance: attempt SQL-like input in payload fields or query parameters; ensure the app rejects invalid input via validation and parameter binding.

Operational notes
- If you’re deploying to multiple instances, enable RATE_LIMIT_KV to have a consistent rate limit across instances.
- Consider binding Cloudflare Edge Rate Limiting to catch abuse at the edge before it hits workers.
- Rotate secrets regularly and store them in a secure secret store in CI/CD.
- Document any security incidents and remediation steps in a runbook.

Contributing
- Before submitting changes, ensure tests pass and review any security-sensitive changes with a teammate.
- Keep secrets out of the codebase; use the repo’s .env.example as a reference for required environment variables.
- Threat modeling additions (new): Allow-list based access control
- We added per-endpoint allow-lists for sensitive routes to block unintended access unless the caller is whitelisted.
- How to configure allow-lists:
  - ALLOWED_ADMIN_IPS: comma-separated IPs allowed to reach /api/admin
  - ALLOWED_SUBMIT_IPS: comma-separated IPs allowed to reach /api/submit
- Behavior:
  - If an allow-list is not configured (empty), access is allowed (to avoid blocking in dev).
  - If configured, only IPs in the list are allowed; others get 403 Forbidden.
