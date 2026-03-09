#!/usr/bin/env node
/**
 * sync-routes.ts
 *
 * Reads route-manifest.json and calls the admin API to sync routes.
 * Supports both dry-run (preview) and apply modes.
 *
 * Usage:
 *   npm run sync:routes:dry-run     — preview changes, no DB writes
 *   npm run sync:routes:apply       — apply changes to registry
 *
 * Requires ADMIN_API_URL and ADMIN_API_TOKEN env vars:
 *   ADMIN_API_URL=http://localhost:8088
 *   ADMIN_API_TOKEN=<your-jwt-token>
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

const manifestPath = path.resolve(__dirname, 'route-manifest.json');
const apiUrl = process.env.ADMIN_API_URL ?? 'http://localhost:8088';
const apiToken = process.env.ADMIN_API_TOKEN ?? '';
const isDryRun = !process.argv.includes('--apply');

if (!fs.existsSync(manifestPath)) {
  console.error(`[sync-routes] Manifest not found: ${manifestPath}`);
  console.error('Run: npm run generate:route-manifest first');
  process.exit(1);
}

if (!apiToken) {
  console.error('[sync-routes] ADMIN_API_TOKEN env var is required');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
const endpoint = isDryRun
  ? `${apiUrl}/api/admin/v1/routes/sync/dry-run`
  : `${apiUrl}/api/admin/v1/routes/sync/apply`;

console.log(`[sync-routes] Mode: ${isDryRun ? 'DRY-RUN' : 'APPLY'}`);
console.log(`[sync-routes] Endpoint: ${endpoint}`);
console.log(`[sync-routes] Routes in manifest: ${manifest.length}`);

const body = JSON.stringify(manifest);
const url = new URL(endpoint);
const lib = url.protocol === 'https:' ? https : http;

const req = lib.request(
  {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      Authorization: `Bearer ${apiToken}`,
    },
  },
  (res) => {
    let data = '';
    res.on('data', chunk => (data += chunk));
    res.on('end', () => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        const result = JSON.parse(data);
        console.log('\n[sync-routes] Result:');
        console.log(`  New routes:     ${result.newRoutes?.length ?? 0}`);
        if (result.newRoutes?.length) console.log('  ', result.newRoutes.join(', '));
        console.log(`  Updated routes: ${result.updatedRoutes?.length ?? 0}`);
        if (result.updatedRoutes?.length) console.log('  ', result.updatedRoutes.join(', '));
        console.log(`  Stale routes:   ${result.staleRoutes?.length ?? 0}`);
        if (result.staleRoutes?.length) console.log('  ', result.staleRoutes.join(', '));
        console.log(`  Conflicts:      ${result.conflicts?.length ?? 0}`);
        if (result.conflicts?.length) console.log('  ', result.conflicts.join(', '));
        console.log(`  Dry-run:        ${result.dryRun}`);
        if (isDryRun) {
          console.log('\n[sync-routes] No changes written. Run with --apply to apply.');
        } else {
          console.log('\n[sync-routes] Changes applied to route registry.');
        }
      } else {
        console.error(`[sync-routes] HTTP ${res.statusCode}: ${data}`);
        process.exit(1);
      }
    });
  }
);

req.on('error', (e) => {
  console.error(`[sync-routes] Request failed: ${e.message}`);
  process.exit(1);
});

req.write(body);
req.end();

export {};
