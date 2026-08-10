# Incident Response Plan — Solid Roots

This document outlines the steps to take in the event of a security incident or data breach.

## 1. Preparation
*   **Audit Logs**: Ensure `audits` table is being populated and monitored via `npm run monitor`.
*   **Backups**: Run `node tools/backup-db.mjs` weekly.
*   **Secrets**: Keep `ADMIN_SECRET` in a secure password manager.

## 2. Detection
Incidents may be detected via:
*   High volume of `admin_unauthorized`, `submit_forbidden`, or `submit_ratelimit` events in audit logs.
*   Unexpected spikes in inquiry submissions or admin deletions.
*   Automated GitHub Security Action alerts (vulnerable dependencies).

## 3. Immediate Action (Containment)
1.  **Isolate**: If an IP is attacking, add it to `ALLOWED_ADMIN_IPS` (to exclude it) or block it via the Cloudflare WAF (Web Application Firewall).
2.  **Rotate Secrets**: If `ADMIN_SECRET` is leaked, change it in the Cloudflare Dashboard.

## 4. Recovery
1.  **Restore Data**: If data was corrupted, use the latest backup:
    ```bash
    npx wrangler d1 execute <db-name> --file=./backups/latest-backup.sql
    ```
2.  **Patch**: Fix the vulnerability identified during the detection phase.
3.  **Audit**: Review all audit logs around the time of the incident to identify the extent of the breach.

## 5. Post-Incident
*   Document what happened, how it was handled, and what steps were taken to prevent recurrence.
*   Notify affected users if PII (email/phone) was compromised.
*   Update security policies (CSP, Allow-lists) if necessary.
