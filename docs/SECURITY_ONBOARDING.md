# Security Onboarding Guide

This document helps new contributors understand how this project handles security, access control, and operational onboarding.

## Overview

Solid Roots is a static marketing site with two server endpoints:

- `POST /api/submit` — accepts a buy/sell inquiry from the public form.
- `GET|DELETE /api/admin` — lets an operator list and delete inquiries.

The security model is deliberately small:

- Admin endpoints require a server-side secret (`ADMIN_SECRET`); there are no client-trusted checks.
- All inputs are validated and sanitized before storage, and every DB call uses parameterized queries.
- Sensitive routes are rate limited (KV-based when configured, in-memory fallback otherwise) and can be restricted by IP allow-list.
- Sensitive actions are written to an `audits` table.

There is no user login, JWT, or MFA — inquiries are stored without an account.

## Prerequisites

- Node.js 18+ (for the test harness and tooling)
- Cloudflare Workers/Pages (or a local `wrangler` dev environment)
- A D1 database (a lightweight in-repo mock is used in tests)
- Familiarity with the environment variables:
  - `ADMIN_SECRET`: secret for admin endpoints (required)
  - `RATE_LIMIT_KV`: optional KV binding for distributed rate limiting
  - `ALLOWED_ADMIN_IPS` / `ALLOWED_SUBMIT_IPS`: optional comma-separated IP allow-lists

## Environment setup

- Secrets must never be committed; use `wrangler secret` or an environment manager.
- See `.env.example` for the required variables.

## Database schema

`schema.sql` contains the `CREATE` statements. Two tables:

- `inquiries` — buy/sell submissions (`type`, `email`, `phone`, `answers` JSON, `created_at`).
- `audits` — an append-only trail of sensitive actions.

## Local development workflow

- Install dependencies: `npm install`
- Run tests: `npm test` (submit-contract + admin field extractors)
- Start local emulation: `npm run dev` (wrangler Pages dev with a D1 binding)

## Access control

- `/api/admin`: gated by `ADMIN_SECRET`, rate limited, optional IP allow-list. Deletes are audit-logged.
- `/api/submit`: open to the public form; rate limited, optional IP allow-list, input validated/sanitized.

## Allow-lists

- `ALLOWED_ADMIN_IPS`: comma-separated IPs allowed to reach `/api/admin`.
- `ALLOWED_SUBMIT_IPS`: comma-separated IPs allowed to reach `/api/submit`.
- If a list is unset (empty), access is allowed (to avoid blocking in dev). If set, only listed IPs are allowed; others get `403 Forbidden`.

## Operational notes

- For multiple instances, bind `RATE_LIMIT_KV` for a consistent rate limit across them.
- Consider Cloudflare edge rate limiting to catch abuse before it reaches the workers.
- Rotate `ADMIN_SECRET` regularly and store it in a secure secret store.
- Record incidents and remediation in `docs/security/incident-response.md`.

## Contributing

- Ensure `npm test` passes and review security-sensitive changes with a teammate.
- Keep secrets out of the codebase; use `.env.example` as the reference for required variables.
