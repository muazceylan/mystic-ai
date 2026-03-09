#!/usr/bin/env node
/**
 * generate-route-manifest.ts
 *
 * Scans the Expo Router file tree in mysticai-mobile/src/app/
 * and generates a route manifest JSON suitable for the admin route sync API.
 *
 * Usage:
 *   npx ts-node scripts/generate-route-manifest.ts [--mobile-path ../mysticai-mobile/src/app]
 *   npm run generate:route-manifest
 *
 * Output:
 *   scripts/route-manifest.json   (committed or gitignored depending on workflow)
 *
 * Then sync:
 *   npm run sync:routes:dry-run   — preview what would change
 *   npm run sync:routes:apply     — apply changes to registry
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Config ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const mobilePath = args.find(a => a.startsWith('--mobile-path='))?.split('=')[1]
  ?? path.resolve(__dirname, '../../mysticai-mobile/src/app');
const outputPath = path.resolve(__dirname, 'route-manifest.json');

// Module key heuristics — map Expo Router folder names to AppModule keys
const FOLDER_TO_MODULE: Record<string, string> = {
  home: 'home',
  dreams: 'dream_analysis',
  spiritual: 'spiritual',
  compatibility: 'compatibility',
  numerology: 'numerology',
  meditation: 'meditation',
  horoscope: 'weekly_horoscope',
  transits: 'daily_transits',
  planner: 'daily_transits',
  notifications: 'notifications',
  profile: 'profile',
};

// Routes that do NOT require authentication (public screens)
const PUBLIC_ROUTES = new Set([
  'welcome', 'login', 'signup', 'forgot-password',
  'verify-email', 'email-register', 'oauth2',
]);

// ── Types ────────────────────────────────────────────────────────────────────

interface ManifestEntry {
  routeKey: string;
  path: string;
  displayName: string;
  moduleKey: string | null;
  requiresAuth: boolean;
  platform: 'IOS' | 'ANDROID' | 'BOTH';
  source: string;
}

// ── Scanner ──────────────────────────────────────────────────────────────────

function toRouteKey(filePath: string): string {
  return filePath
    .replace(/\.(tsx|ts|js|jsx)$/, '')
    .replace(/\/index$/, '')
    .replace(/\[([^\]]+)\]/g, ':$1')  // [id] → :id
    .replace(/^\(([^)]+)\)\//, '')    // strip (tabs)/ etc from start
    .replace(/\//g, '_')
    .replace(/^_+/, '')
    .replace(/[^a-z0-9_:]/gi, '_')
    .toLowerCase()
    || 'root';
}

function toDisplayName(segment: string): string {
  return segment
    .replace(/\[.*?\]/g, 'Detail')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function inferModuleKey(segments: string[]): string | null {
  for (const seg of segments) {
    const clean = seg.replace(/[()[\]]/g, '');
    if (FOLDER_TO_MODULE[clean]) return FOLDER_TO_MODULE[clean];
  }
  return null;
}

function scanDir(dir: string, prefix = ''): ManifestEntry[] {
  const entries: ManifestEntry[] = [];

  if (!fs.existsSync(dir)) {
    console.warn(`[generate-route-manifest] Directory not found: ${dir}`);
    return entries;
  }

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const full = path.join(dir, item.name);
    const rel = prefix ? `${prefix}/${item.name}` : item.name;

    if (item.isDirectory()) {
      entries.push(...scanDir(full, rel));
    } else if (/\.(tsx|ts|jsx|js)$/.test(item.name) && item.name !== '_layout.tsx') {
      const routePath = '/' + rel
        .replace(/\.(tsx|ts|js|jsx)$/, '')
        .replace(/\(([^)]+)\)\//g, '')    // strip (groups)
        .replace(/\/index$/, '');

      const segments = rel.split('/');
      const lastSegment = segments[segments.length - 1]?.replace(/\.(tsx|ts|js|jsx)$/, '') ?? '';
      const routeKey = toRouteKey(rel);
      const displayName = toDisplayName(lastSegment === 'index' ? (segments[segments.length - 2] ?? 'home') : lastSegment);
      const moduleKey = inferModuleKey(segments);
      const requiresAuth = !PUBLIC_ROUTES.has(lastSegment.replace(/\[.*?\]/, 'detail').toLowerCase());

      entries.push({
        routeKey,
        path: routePath,
        displayName,
        moduleKey,
        requiresAuth,
        platform: 'BOTH',
        source: 'expo-router-scan',
      });
    }
  }

  return entries;
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log(`[generate-route-manifest] Scanning: ${mobilePath}`);
const manifest = scanDir(mobilePath);

// Deduplicate by routeKey (keep first)
const seen = new Set<string>();
const deduped = manifest.filter(e => {
  if (seen.has(e.routeKey)) return false;
  seen.add(e.routeKey);
  return true;
});

fs.writeFileSync(outputPath, JSON.stringify(deduped, null, 2));
console.log(`[generate-route-manifest] Written ${deduped.length} routes to ${outputPath}`);

export {};
