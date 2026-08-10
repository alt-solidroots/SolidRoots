/**
 * Monitor Solid Roots Audit Logs for Anomalies
 * This tool scans the 'audits' table for suspicious patterns in the last 24 hours.
 * Usage: node tools/monitor-anomalies.mjs <db-name>
 */

import { execSync } from 'child_process';

const DB_NAME = process.argv[2] || 'solid-roots-db';

const QUERIES = {
  UNAUTHORIZED_ADMIN_BY_IP: `
    SELECT details as ip, COUNT(*) as count
    FROM audits
    WHERE action = 'admin_unauthorized' AND timestamp > datetime('now', '-24 hours')
    GROUP BY details
    HAVING count > 3;
  `,
  SUBMIT_RATE_LIMITED_BY_IP: `
    SELECT details as ip, COUNT(*) as count
    FROM audits
    WHERE action IN ('submit_ratelimit', 'submit_forbidden') AND timestamp > datetime('now', '-24 hours')
    GROUP BY details
    HAVING count > 10;
  `
};

function runQuery(name, sql) {
    console.log(`\n--- Checking: ${name} ---`);
    try {
        // Run wrangler command and parse JSON output
        const output = execSync(`npx wrangler d1 execute ${DB_NAME} --command="${sql.replace(/\s+/g, ' ').trim()}" --json`, { stdio: ['inherit', 'pipe', 'pipe'] }).toString();
        const data = JSON.parse(output);
        const results = data[0].results;

        if (!results || results.length === 0) {
            console.log("✅ No anomalies detected.");
        } else {
            console.warn("⚠️ ANOMALIES DETECTED:");
            console.table(results);
        }
    } catch (e) {
        console.error(`❌ Error running query ${name}: Make sure wrangler is logged in and DB name is correct.`);
        console.error(`   Details: ${e.message}`);
    }
}

console.log(`Starting anomaly detection for database: ${DB_NAME}...`);
Object.entries(QUERIES).forEach(([name, sql]) => runQuery(name, sql));
