/**
 * App version / force-update QA.
 *
 * Behavioural half: compiles the pure policy module (no native/network imports) with the
 * project's own tsc and exercises the decision matrix.
 * Static half: asserts the wiring that cannot be unit-tested here — native version reading,
 * no hardcoded policy values, and the fail-safe on a failed check.
 *
 * Run: npm run qa:app-version
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');

// ── compile the pure policy module ──────────────────────────────────────────
const outDir = mkdtempSync(join(tmpdir(), 'app-version-policy-'));
let policy;
try {
  execFileSync(
    join(root, 'node_modules/.bin/tsc'),
    [
      join(root, 'src/services/appVersionPolicy.ts'),
      '--outDir', outDir,
      '--target', 'es2022',
      '--module', 'es2022',
      '--moduleResolution', 'bundler',
      '--skipLibCheck',
    ],
    { stdio: 'pipe' },
  );
  // tsc cannot emit .mjs directly; rename so node loads the output as an ES module.
  const compiled = join(outDir, 'appVersionPolicy.mjs');
  renameSync(join(outDir, 'appVersionPolicy.js'), compiled);
  policy = await import(pathToFileURL(compiled).href);
} catch (error) {
  rmSync(outDir, { recursive: true, force: true });
  throw error;
}

const { compareVersions, isOlderThan, evaluateStatusLocally, resolveUpdateStatus } = policy;

// ── semantic version comparison ─────────────────────────────────────────────
assert.equal(compareVersions('1.10.0', '1.9.0'), 1, '1.10.0 must be newer than 1.9.0');
assert.equal(compareVersions('1.9.0', '1.10.0'), -1);
assert.equal(compareVersions('1.2', '1.2.0'), 0, 'missing segments are zero');
assert.equal(compareVersions('2.0.0', '1.99.99'), 1);
assert.equal(compareVersions('1.2.0', '1.2.0'), 0);

// ── build-number comparison ─────────────────────────────────────────────────
assert.equal(isOlderThan('1.0.0', 24, '1.1.0', 25), true);
assert.equal(isOlderThan('1.1.0', 25, '1.1.0', 25), false);
assert.equal(isOlderThan('1.3.0', 31, '1.2.0', 27), false, 'newer build is never "older"');
assert.equal(isOlderThan('1.0.0', 0, '1.1.0', 25), true, 'build 0 is still compared');
assert.equal(isOlderThan('1.0.0', null, undefined, undefined), false, 'unknown target never blocks');
// build 0 on the target side means "unset" → fall back to semantic versions
assert.equal(isOlderThan('1.0.0', 24, '1.1.0', 0), true);
assert.equal(isOlderThan('1.2.0', 24, '1.1.0', 0), false);

// ── decision matrix (mirrors AppVersionServiceTest on the backend) ──────────
const androidPolicy = {
  platform: 'android',
  latestVersion: '1.2.0',
  latestBuild: 27,
  minimumSupportedVersion: '1.1.0',
  minimumSupportedBuild: 25,
  forceUpdateEnabled: true,
  optionalUpdateEnabled: true,
  message: null,
  forceUpdate: true,
  minSupportedVersion: '1.1.0',
  iosStoreUrl: null,
  androidStoreUrl: null,
  androidWebStoreUrl: null,
};

assert.equal(evaluateStatusLocally(androidPolicy, '1.0.0', 24), 'FORCE_UPDATE');
assert.equal(evaluateStatusLocally(androidPolicy, '1.1.0', 25), 'OPTIONAL_UPDATE');
assert.equal(evaluateStatusLocally(androidPolicy, '1.1.5', 26), 'OPTIONAL_UPDATE');
assert.equal(evaluateStatusLocally(androidPolicy, '1.2.0', 27), 'UP_TO_DATE');
// TestFlight / internal / staged builds must never be pushed backwards
assert.equal(evaluateStatusLocally(androidPolicy, '1.3.0', 31), 'UP_TO_DATE');

// force off downgrades the block to a nudge; it must never force everyone
assert.equal(
  evaluateStatusLocally({ ...androidPolicy, forceUpdateEnabled: false, forceUpdate: false }, '1.0.0', 24),
  'OPTIONAL_UPDATE',
);
// optional off leaves a supported user alone but still enforces the minimum
assert.equal(
  evaluateStatusLocally({ ...androidPolicy, optionalUpdateEnabled: false }, '1.1.5', 26),
  'UP_TO_DATE',
);
assert.equal(
  evaluateStatusLocally({ ...androidPolicy, optionalUpdateEnabled: false }, '1.0.0', 24),
  'FORCE_UPDATE',
);
// force on with no configured minimum must not block anyone
assert.equal(
  evaluateStatusLocally(
    { ...androidPolicy, minimumSupportedBuild: 0, minimumSupportedVersion: '0.0.0', minSupportedVersion: '0.0.0' },
    '1.1.0',
    25,
  ),
  'OPTIONAL_UPDATE',
);

// legacy backend response (no status / build fields) still resolves correctly
const legacyResponse = {
  platform: 'android',
  latestVersion: '1.2.0',
  message: null,
  forceUpdate: true,
  minSupportedVersion: '1.1.0',
  iosStoreUrl: null,
  androidStoreUrl: null,
  androidWebStoreUrl: null,
};
assert.equal(evaluateStatusLocally(legacyResponse, '1.0.0', 24), 'FORCE_UPDATE');
assert.equal(evaluateStatusLocally(legacyResponse, '1.1.0', 25), 'UP_TO_DATE',
  'optionalUpdateEnabled is absent on legacy responses → no nudge');

// the server's decision always wins over local evaluation
assert.equal(resolveUpdateStatus({ ...androidPolicy, status: 'UP_TO_DATE' }, '1.0.0', 24), 'UP_TO_DATE');
assert.equal(resolveUpdateStatus(androidPolicy, '1.0.0', 24), 'FORCE_UPDATE');

rmSync(outDir, { recursive: true, force: true });

// ── static wiring assertions ────────────────────────────────────────────────
const check = read('src/services/appVersionCheck.ts');
const layout = read('src/app/_layout.tsx');
const modal = read('src/components/ui/AppUpdateModal.tsx');
const buildGradle = read('android/app/build.gradle');
const infoPlist = read('ios/AstroGuru/Info.plist');

// Installed version/build must come from the native package, never a duplicated constant.
assert.match(check, /Application\.nativeApplicationVersion/);
assert.match(check, /Application\.nativeBuildVersion/);
assert.doesNotMatch(check, /EXPO_PUBLIC_[A-Z_]*VERSION/);
assert.doesNotMatch(check, /minimumSupportedBuild\s*[:=]\s*\d/, 'no hardcoded policy values');
assert.doesNotMatch(check, /latestBuild\s*[:=]\s*\d/, 'no hardcoded policy values');

// Android reads versionName/versionCode from Gradle; iOS from the Xcode build settings.
assert.match(buildGradle, /versionCode\s+\d+/);
assert.match(buildGradle, /versionName\s+"\d+\.\d+\.\d+"/);
assert.match(infoPlist, /<key>CFBundleShortVersionString<\/key>\s*<string>\$\(MARKETING_VERSION\)<\/string>/);
assert.match(infoPlist, /<key>CFBundleVersion<\/key>\s*<string>\$\(CURRENT_PROJECT_VERSION\)<\/string>/);

// The installed version is reported to the backend, which owns the decision.
assert.match(check, /installedVersion/);
assert.match(check, /installedBuild/);
assert.match(check, /'\/api\/v1\/app-version'/);

// Fail-safe: a failed check resolves to UP_TO_DATE, never a block or a stuck loader.
assert.match(check, /if \(!versionInfo\) \{\s*\n\s*return \{ status: 'UP_TO_DATE'/);

// Startup check plus a re-check on background → active, so returning from the store recovers.
const bootstrapStart = layout.indexOf('function AppVersionBootstrap');
assert.ok(bootstrapStart > 0, 'AppVersionBootstrap must exist');
const bootstrap = layout.slice(bootstrapStart, layout.indexOf('function CompanionBootstrap'));
assert.match(bootstrap, /runAfterInteractions/);
assert.match(bootstrap, /appState\.current === 'background' && next === 'active'/);
assert.match(bootstrap, /status === 'UP_TO_DATE'/);
assert.match(bootstrap, /isOptionalUpdateDismissed/);

// A forced update blocks the app; an optional one can be dismissed.
assert.match(layout, /mode=\{appUpdate\.status === 'FORCE_UPDATE' \? 'force' : 'optional'\}/);
assert.match(modal, /BackHandler\.addEventListener\('hardwareBackPress', \(\) => true\)/);
assert.match(modal, /if \(!visible \|\| !isForced \|\| Platform\.OS !== 'android'\) return;/);
assert.match(modal, /\{!isForced && \(/, 'the Later button renders only for optional updates');

// Admin-authored copy wins, bundled i18n is the fallback.
assert.match(modal, /versionInfo\.title\?\.trim\(\)/);
assert.match(modal, /t\(isForced \? 'appUpdate\.forcedTitle' : 'appUpdate\.optionalTitle'\)/);

for (const locale of ['tr', 'en']) {
  const strings = JSON.parse(read(`src/i18n/${locale}.json`));
  for (const key of ['forcedTitle', 'forcedBody', 'optionalTitle', 'optionalBody', 'updateCta', 'laterCta']) {
    assert.ok(strings.appUpdate?.[key], `${locale}.json is missing appUpdate.${key}`);
  }
}

// Analytics coverage for the prompt.
assert.match(modal, /trackEvent\('app_update_prompt_shown'/);
assert.match(modal, /trackEvent\('app_update_cta_tapped'/);
assert.match(modal, /trackEvent\('app_update_dismissed'/);

console.log('app-version-policy QA: all assertions passed');
