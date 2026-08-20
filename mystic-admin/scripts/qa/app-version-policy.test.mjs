/**
 * Admin app-version policy validation + preview QA.
 *
 * Compiles the pure helper with the project's own tsc and exercises it, so the guardrails that
 * stand between an admin and a production lockout are actually verified.
 *
 * Run: pnpm qa:app-version
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');

const outDir = mkdtempSync(join(tmpdir(), 'admin-app-version-'));
let helper;
try {
  try {
    execFileSync(
      join(root, 'node_modules/.bin/tsc'),
      [
        join(root, 'src/lib/appVersionPolicy.ts'),
        '--outDir', outDir,
        '--target', 'es2022',
        '--module', 'es2022',
        '--moduleResolution', 'bundler',
        '--skipLibCheck',
      ],
      { stdio: 'pipe' },
    );
  } catch (error) {
    // The helper's only import is `import type ... from '@/types'`, which tsc cannot resolve
    // outside the Next path aliases. Type imports are erased on emit, so a TS2307 here is
    // expected and harmless — anything else is a real compile failure.
    const diagnostics = String(error.stdout ?? '');
    const unexpected = diagnostics
      .split('\n')
      .filter((line) => line.trim() && !line.includes('error TS2307'));
    if (unexpected.length > 0) throw new Error(`tsc failed:\n${diagnostics}`);
  }
  // tsc cannot emit .mjs directly; rename so node loads the output as an ES module.
  const compiled = join(outDir, 'appVersionPolicy.mjs');
  renameSync(join(outDir, 'appVersionPolicy.js'), compiled);
  helper = await import(pathToFileURL(compiled).href);
} catch (error) {
  rmSync(outDir, { recursive: true, force: true });
  throw error;
}

const {
  isValidSemanticVersion,
  compareSemanticVersions,
  validateAppVersionPolicy,
  hasErrors,
  previewStatusForBuild,
  buildUpdateBands,
} = helper;

const base = {
  latestVersion: '1.2.0',
  latestBuild: 27,
  minimumSupportedVersion: '1.1.0',
  minimumSupportedBuild: 25,
  forceUpdateEnabled: true,
  optionalUpdateEnabled: true,
  storeUrl: 'https://play.google.com/store/apps/details?id=com.astroguru.mmc',
  androidStoreUrl: 'market://details?id=com.astroguru.mmc',
  titleTr: 'Yeni sürüm',
  messageTr: 'Güncelle',
  titleEn: 'New version',
  messageEn: 'Please update',
};

// ── semantic version format ─────────────────────────────────────────────────
for (const good of ['1.0.0', '1.2.5', '2.0.0', '1.2', '1.2.0-rc1']) {
  assert.ok(isValidSemanticVersion(good), `${good} should be valid`);
}
for (const bad of ['', 'v1.2.0', '1.2.3.4', 'latest', null, undefined]) {
  assert.ok(!isValidSemanticVersion(bad), `${bad} should be invalid`);
}

// Versions must never be compared as plain strings.
assert.equal(compareSemanticVersions('1.10.0', '1.9.0'), 1);
assert.equal(compareSemanticVersions('1.9.0', '1.10.0'), -1);
assert.equal(compareSemanticVersions('1.2', '1.2.0'), 0);

// ── validation ──────────────────────────────────────────────────────────────
assert.ok(!hasErrors(validateAppVersionPolicy(base)), 'a valid policy has no errors');

// The exact configuration the spec says must be rejected.
const inverted = validateAppVersionPolicy({ ...base, latestBuild: 25, minimumSupportedBuild: 27 });
assert.ok(inverted.minimumSupportedBuild, 'min build above latest build must be rejected');
assert.match(inverted.minimumSupportedBuild, /25/);

assert.ok(validateAppVersionPolicy({ ...base, latestBuild: -1 }).latestBuild, 'negative build rejected');
assert.ok(validateAppVersionPolicy({ ...base, latestBuild: 2.5 }).latestBuild, 'non-integer build rejected');
assert.ok(validateAppVersionPolicy({ ...base, latestBuild: Number.NaN }).latestBuild, 'NaN build rejected');
assert.ok(!validateAppVersionPolicy({ ...base, minimumSupportedBuild: 0 }).minimumSupportedBuild,
  'zero is a valid minimum');
assert.ok(!validateAppVersionPolicy({ ...base, minimumSupportedBuild: 27 }).minimumSupportedBuild,
  'minimum equal to latest is allowed');

assert.ok(validateAppVersionPolicy({ ...base, latestVersion: 'v1.2' }).latestVersion);
assert.ok(
  validateAppVersionPolicy({ ...base, minimumSupportedVersion: '1.3.0', latestVersion: '1.2.0' })
    .minimumSupportedVersion,
  'minimum version newer than latest must be rejected',
);
assert.ok(validateAppVersionPolicy({ ...base, storeUrl: '   ' }).storeUrl,
  'force update without a store link must be rejected');
assert.ok(!validateAppVersionPolicy({ ...base, storeUrl: '', forceUpdateEnabled: false }).storeUrl,
  'store link is only required when force update is on');

// ── preview ─────────────────────────────────────────────────────────────────
assert.equal(previewStatusForBuild(base, 24), 'FORCE_UPDATE');
assert.equal(previewStatusForBuild(base, 25), 'OPTIONAL_UPDATE');
assert.equal(previewStatusForBuild(base, 26), 'OPTIONAL_UPDATE');
assert.equal(previewStatusForBuild(base, 27), 'UP_TO_DATE');
assert.equal(previewStatusForBuild(base, 31), 'UP_TO_DATE');
assert.equal(previewStatusForBuild({ ...base, forceUpdateEnabled: false }, 24), 'OPTIONAL_UPDATE');
assert.equal(previewStatusForBuild({ ...base, optionalUpdateEnabled: false }, 26), 'UP_TO_DATE');

// Bands must describe exactly the same ranges the preview resolves to.
const bands = buildUpdateBands(base);
assert.deepEqual(bands, [
  { status: 'UP_TO_DATE', range: 'Build 27 ve üzeri' },
  { status: 'OPTIONAL_UPDATE', range: 'Build 25-26' },
  { status: 'FORCE_UPDATE', range: 'Build 24 ve altı' },
]);

for (const band of bands) {
  const [, low] = band.range.match(/Build (\d+)/);
  assert.equal(previewStatusForBuild(base, Number(low)), band.status,
    `band "${band.range}" disagrees with previewStatusForBuild`);
}

// A single-build optional window reads as one build, not a range.
assert.deepEqual(buildUpdateBands({ ...base, latestBuild: 26, minimumSupportedBuild: 25 })[1],
  { status: 'OPTIONAL_UPDATE', range: 'Build 25' });

// Force off means nobody is ever blocked.
assert.ok(!buildUpdateBands({ ...base, forceUpdateEnabled: false })
  .some((b) => b.status === 'FORCE_UPDATE'));
// Optional off means no nudge band at all.
assert.ok(!buildUpdateBands({ ...base, optionalUpdateEnabled: false })
  .some((b) => b.status === 'OPTIONAL_UPDATE'));

rmSync(outDir, { recursive: true, force: true });

// ── static wiring ───────────────────────────────────────────────────────────
const page = read('src/app/app-version/page.tsx');
const api = read('src/lib/api.ts');
const sidebar = read('src/components/layout/Sidebar.tsx');

// The admin never enters the version a user has installed.
assert.doesNotMatch(page, /installedVersion|installedBuild/,
  'the admin form must not ask for the installed version');

// Explicit save, not save-on-keystroke.
assert.match(page, /onSubmit=\{handleSubmit\(onSubmit\)\}/);
assert.match(page, /Değişiklikleri Kaydet/);
assert.match(page, /Mobil uygulama sürüm ayarları başarıyla güncellendi\./);

// Raising the floor with enforcement on must be confirmed first.
assert.match(page, /normalized\.forceUpdateEnabled && normalized\.minimumSupportedBuild > previousMinBuild/);
assert.match(page, /setPendingSave\(normalized\)/);
assert.match(page, /Vazgeç/);
assert.match(page, /Onayla/);

// Both platforms are configurable.
assert.match(page, /key: 'ios'/);
assert.match(page, /key: 'android'/);

// Errors keep the form values (no reset in the error handler).
const errorHandler = page.slice(page.indexOf('onError:'), page.indexOf('const previousMinBuild'));
assert.doesNotMatch(errorHandler, /reset\(/, 'a failed save must not clear the form');

// Typed client, not an ad-hoc fetch in the page.
assert.match(api, /export const appVersionApi/);
assert.match(api, /'\/api\/admin\/v1\/app-version'/);
assert.doesNotMatch(page, /\bfetch\(|axios\./, 'pages must go through the typed api client');

assert.match(sidebar, /href: '\/app-version'/);

console.log('admin app-version-policy QA: all assertions passed');
