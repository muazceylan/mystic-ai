#!/usr/bin/env node
/**
 * Guards the AdMob configuration that actually ships.
 *
 * This project uses the bare workflow: android/ and ios/ are committed and
 * `expo prebuild` never runs, so the config plugins in app.config.ts do NOT
 * reach the native projects. That has bitten us before — the native App IDs
 * sat on a retired AdMob publisher for weeks while .env.production pointed at
 * the current one, so Android rewarded ads could not fill.
 *
 * This script fails the build when the native files drift from the env that
 * the same build sources. It reads only committed files; no network, no SDKs.
 *
 * Usage: node scripts/verify-native-ad-config.mjs [--env <file>] [--platform android|ios|all]
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const argOf = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const ENV_FILE = argOf('--env', '.env.production');
const PLATFORM = argOf('--platform', 'all');

// Mediation adapters that must be present in the native build files.
// Versions are pinned deliberately — see the comments in the native files.
const ANDROID_MEDIATION = [
  'com.google.ads.mediation:unity:4.17.0.0',
  'com.unity3d.ads:unity-ads:4.17.0',
];
const IOS_MEDIATION = [{ pod: 'GoogleMobileAdsMediationUnity', version: '4.17.0.0' }];

// SKAdNetwork IDs that must be present for the networks in the waterfall.
// Google's own plus Unity Ads'. The full advised list is longer; these are the
// ones whose absence directly breaks attribution for the configured networks.
const REQUIRED_SKADNETWORK = [
  'cstr6suwn9.skadnetwork', // Google
  'su67r6k2v3.skadnetwork', // Unity Ads
  '4dzt52r2t5.skadnetwork', // Unity Ads
];

const GOOGLE_TEST_PUBLISHER = 'ca-app-pub-3940256099942544';

const failures = [];
const notes = [];
const fail = (msg) => failures.push(msg);

function read(relPath) {
  try {
    return readFileSync(resolve(ROOT, relPath), 'utf8');
  } catch {
    fail(`Cannot read ${relPath}`);
    return null;
  }
}

/** Minimal dotenv parse — good enough for KEY=value lines. */
function parseEnv(relPath) {
  const raw = read(relPath);
  if (raw === null) return {};
  const out = {};
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = parseEnv(ENV_FILE);

/** App IDs use `~`, ad unit IDs use `/`. Swapping them is a classic, silent break. */
function checkIdShape(label, value, kind) {
  if (!value) {
    fail(`${ENV_FILE}: ${label} is empty or missing`);
    return false;
  }
  if (!value.startsWith('ca-app-pub-')) {
    fail(`${label} is not a valid AdMob identifier: ${value}`);
    return false;
  }
  if (kind === 'app' && !value.includes('~')) {
    fail(`${label} must be an App ID (contains "~"), got: ${value}`);
    return false;
  }
  if (kind === 'unit' && !value.includes('/')) {
    fail(`${label} must be an Ad Unit ID (contains "/"), got: ${value}`);
    return false;
  }
  return true;
}

const publisherOf = (id) => (id?.match(/ca-app-pub-(\d+)/) || [])[1];

// ---------------------------------------------------------------- env shape
const androidAppId = env.ADMOB_ANDROID_APP_ID;
const iosAppId = env.ADMOB_IOS_APP_ID;
const androidUnit = env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_UNIT_ID;
const iosUnit = env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_UNIT_ID;

checkIdShape('ADMOB_ANDROID_APP_ID', androidAppId, 'app');
checkIdShape('ADMOB_IOS_APP_ID', iosAppId, 'app');
checkIdShape('EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_UNIT_ID', androidUnit, 'unit');
checkIdShape('EXPO_PUBLIC_ADMOB_IOS_REWARDED_UNIT_ID', iosUnit, 'unit');

// Every id in one build must belong to a single publisher. A mixed pair is the
// exact failure we shipped before: ads request against an account that does not
// own the app, and fill silently drops to zero.
const publishers = new Set(
  [androidAppId, iosAppId, androidUnit, iosUnit].filter(Boolean).map(publisherOf),
);
if (publishers.size > 1) {
  fail(`Mixed AdMob publishers in ${ENV_FILE}: ${[...publishers].join(', ')}. All IDs must share one publisher.`);
}

// Test ad units must never reach a production build.
for (const [k, v] of Object.entries(env)) {
  if (k.startsWith('EXPO_PUBLIC_ADMOB') && typeof v === 'string' && v.includes(GOOGLE_TEST_PUBLISHER)) {
    fail(`${ENV_FILE}: ${k} points at the Google test publisher (${v})`);
  }
}
for (const [flag, label] of [
  ['EXPO_PUBLIC_ADMOB_USE_TEST_IDS_ANDROID', 'Android'],
  ['EXPO_PUBLIC_ADMOB_USE_TEST_IDS_IOS', 'iOS'],
]) {
  if (String(env[flag]).toLowerCase() === 'true') {
    fail(`${ENV_FILE}: ${flag}=true — ${label} would ship Google test ad units.`);
  }
}

// ------------------------------------------------------------------ Android
if (PLATFORM === 'all' || PLATFORM === 'android') {
  const manifest = read('android/app/src/main/AndroidManifest.xml');
  if (manifest) {
    const m = manifest.match(
      /com\.google\.android\.gms\.ads\.APPLICATION_ID"\s+android:value="([^"]+)"/,
    );
    if (!m) {
      fail('AndroidManifest.xml: com.google.android.gms.ads.APPLICATION_ID meta-data not found');
    } else if (m[1] !== androidAppId) {
      fail(
        'AndroidManifest.xml APPLICATION_ID does not match ADMOB_ANDROID_APP_ID\n' +
          `      manifest: ${m[1]}\n` +
          `      ${ENV_FILE}: ${androidAppId}`,
      );
    }
  }

  const gradle = read('android/app/build.gradle');
  if (gradle) {
    for (const dep of ANDROID_MEDIATION) {
      if (!gradle.includes(dep)) {
        fail(`android/app/build.gradle: missing mediation dependency "${dep}"`);
      }
    }
  }
}

// ---------------------------------------------------------------------- iOS
if (PLATFORM === 'all' || PLATFORM === 'ios') {
  const plist = read('ios/AstroGuru/Info.plist');
  if (plist) {
    const m = plist.match(/<key>GADApplicationIdentifier<\/key>\s*<string>([^<]+)<\/string>/);
    if (!m) {
      fail('Info.plist: GADApplicationIdentifier not found');
    } else if (m[1] !== iosAppId) {
      fail(
        'Info.plist GADApplicationIdentifier does not match ADMOB_IOS_APP_ID\n' +
          `      Info.plist: ${m[1]}\n` +
          `      ${ENV_FILE}: ${iosAppId}`,
      );
    }

    const missing = REQUIRED_SKADNETWORK.filter((id) => !plist.includes(id));
    if (missing.length) {
      fail(`Info.plist: missing SKAdNetworkIdentifier entries: ${missing.join(', ')}`);
    }
    const total = (plist.match(/SKAdNetworkIdentifier/g) || []).length;
    notes.push(`Info.plist carries ${total} SKAdNetwork identifiers`);

    if (!plist.includes('NSUserTrackingUsageDescription')) {
      fail('Info.plist: NSUserTrackingUsageDescription is missing — ATT prompt would not appear');
    }
  }

  const podfile = read('ios/Podfile');
  if (podfile) {
    for (const { pod, version } of IOS_MEDIATION) {
      const re = new RegExp(`pod\\s+['"]${pod}['"]\\s*,\\s*['"]${version.replace(/\./g, '\\.')}['"]`);
      if (!re.test(podfile)) {
        fail(`ios/Podfile: missing or mis-versioned pod "${pod}" (expected ${version})`);
      }
    }
  }

  // Podfile.lock is what actually builds; warn if it has not been refreshed.
  const lock = read('ios/Podfile.lock');
  if (lock && !lock.includes('GoogleMobileAdsMediationUnity')) {
    fail(
      'ios/Podfile.lock does not contain GoogleMobileAdsMediationUnity — run `pod install` in ios/ ' +
        'so the mediation adapter is actually linked.',
    );
  }
}

// -------------------------------------------------------------------- report
const label = `native ad config vs ${ENV_FILE} (platform: ${PLATFORM})`;
if (failures.length) {
  console.error(`\n✗ ${label}\n`);
  for (const f of failures) console.error(`  • ${f}`);
  console.error(
    '\n  These files are the source of truth for the shipped build; app.config.ts\n' +
      '  plugins do not apply in this bare-workflow project. Fix the native files\n' +
      '  (or the env) so they agree, then re-run.\n',
  );
  process.exit(1);
}

console.log(`✓ ${label}`);
console.log(`  publisher      ${[...publishers][0]}`);
console.log(`  android app    ${androidAppId}`);
console.log(`  android unit   ${androidUnit}`);
console.log(`  ios app        ${iosAppId}`);
console.log(`  ios unit       ${iosUnit}`);
console.log(`  mediation      ${ANDROID_MEDIATION.join(', ')}`);
console.log(`                 ${IOS_MEDIATION.map((p) => `${p.pod}@${p.version}`).join(', ')}`);
for (const n of notes) console.log(`  ${n}`);
