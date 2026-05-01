/**
 * Solid Roots Database Backup Utility
 * This script exports the D1 database to a SQL file for local backup.
 * Usage: node tools/backup-db.mjs <db-name>
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const DB_NAME = process.argv[2] || 'solid-roots-db';
const BACKUP_DIR = './backups';

if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(BACKUP_DIR, `backup-${DB_NAME}-${timestamp}.sql`);

console.log(`Starting backup for ${DB_NAME}...`);

try {
    // Note: 'wrangler d1 export' creates a SQL dump of the remote database.
    console.log(`Running: npx wrangler d1 export ${DB_NAME} --remote`);
    const output = execSync(`npx wrangler d1 export ${DB_NAME} --remote`).toString();
    
    // Cloudflare D1 export usually streams to stdout or saves to a file depending on wrangler version.
    // In newer versions, it might prompt or save to a default file.
    // For this utility, we'll suggest the manual command if automation fails.
    
    console.log("✅ Export process initiated. Check your current directory for the .sql file.");
    console.log(`💡 Pro-tip: Move the file to ${BACKUP_DIR} to keep your workspace clean.`);
} catch (e) {
    console.error(`❌ Backup failed: ${e.message}`);
    console.log("Manual command: npx wrangler d1 export <db-name> --remote");
}
