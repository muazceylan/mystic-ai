#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const metadataDir = path.join(repoRoot, 'docs', 'app-store', 'metadata');
const locales = ['en-US', 'tr'];
const checkUrls = process.argv.includes('--check-urls');
const failures = [];
const warnings = [];

const limits = {
  name: 30,
  subtitle: 30,
  promotionalText: 170,
  description: 4000,
  keywordsBytes: 100,
  whatsNew: 4000,
  reviewNotesBytes: 4000,
};

const byteLength = (value) => Buffer.byteLength(value, 'utf8');
const characterLength = (value) => Array.from(value).length;

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function validateUrl(value, label, { optional = false } = {}) {
  if (!value && optional) {
    warnings.push(`${label}: empty optional URL`);
    return;
  }
  try {
    const parsed = new URL(value);
    assert(parsed.protocol === 'https:', `${label}: must use HTTPS`);
  } catch {
    failures.push(`${label}: invalid URL`);
  }
}

async function loadJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

async function probeUrl(value, label) {
  try {
    const response = await fetch(value, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(10000) });
    const fallback = response.status === 405
      ? await fetch(value, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(10000) })
      : response;
    assert(fallback.ok, `${label}: HTTP ${fallback.status}`);
    console.log(`${label}: PASS (${fallback.status}, ${fallback.url})`);
  } catch (error) {
    failures.push(`${label}: request failed (${error instanceof Error ? error.message : String(error)})`);
  }
}

const loadedLocales = [];
for (const locale of locales) {
  const metadata = await loadJson(path.join(metadataDir, `${locale}.json`));
  loadedLocales.push(metadata);
  assert(metadata.locale === locale, `${locale}: locale identifier mismatch`);
  assert(characterLength(metadata.name) <= limits.name, `${locale}: name exceeds ${limits.name} characters`);
  assert(characterLength(metadata.subtitle) <= limits.subtitle, `${locale}: subtitle exceeds ${limits.subtitle} characters`);
  assert(characterLength(metadata.promotionalText) <= limits.promotionalText, `${locale}: promotional text exceeds ${limits.promotionalText} characters`);
  assert(characterLength(metadata.description) <= limits.description, `${locale}: description exceeds ${limits.description} characters`);
  assert(byteLength(metadata.keywords) <= limits.keywordsBytes, `${locale}: keywords exceed ${limits.keywordsBytes} UTF-8 bytes`);
  assert(!/\s,|,\s/.test(metadata.keywords), `${locale}: keywords must be comma-separated without spaces`);
  assert(new Set(metadata.keywords.split(',')).size === metadata.keywords.split(',').length, `${locale}: keywords contain duplicates`);
  if (metadata.whatsNew?.applicable) {
    assert(characterLength(metadata.whatsNew.text) <= limits.whatsNew, `${locale}: What's New exceeds ${limits.whatsNew} characters`);
  }
  validateUrl(metadata.supportUrl, `${locale} support URL`);
  validateUrl(metadata.marketingUrl, `${locale} marketing URL`, { optional: true });
  validateUrl(metadata.privacyUrl, `${locale} privacy URL`);

  console.log(`${locale} name: ${characterLength(metadata.name)}/${limits.name} chars`);
  console.log(`${locale} subtitle: ${characterLength(metadata.subtitle)}/${limits.subtitle} chars`);
  console.log(`${locale} promotional text: ${characterLength(metadata.promotionalText)}/${limits.promotionalText} chars`);
  console.log(`${locale} description: ${characterLength(metadata.description)}/${limits.description} chars`);
  console.log(`${locale} keywords: ${byteLength(metadata.keywords)}/${limits.keywordsBytes} bytes`);
}

const submission = await loadJson(path.join(metadataDir, 'submission.json'));
assert(byteLength(submission.reviewNotes) <= limits.reviewNotesBytes, `review notes exceed ${limits.reviewNotesBytes} UTF-8 bytes`);
validateUrl(submission.eula, 'EULA URL');
console.log(`review notes: ${byteLength(submission.reviewNotes)}/${limits.reviewNotesBytes} bytes`);

const saturatedClaims = [
  /fortune teller/i,
  /fortune telling/i,
  /psychic/i,
  /predict your future/i,
  /future prediction/i,
  /know your future/i,
  /guaranteed prediction/i,
  /daily fortune/i,
  /falını öğren/i,
  /geleceğini öğren/i,
  /geleceğini gör/i,
  /kesin tahmin/i,
  /kaderini öğren/i,
];

for (const metadata of loadedLocales) {
  const publicCopy = [metadata.name, metadata.subtitle, metadata.promotionalText, metadata.description, metadata.keywords].join('\n');
  for (const pattern of saturatedClaims) {
    assert(!pattern.test(publicCopy), `${metadata.locale}: saturated-category claim found (${pattern})`);
  }
}

if (checkUrls) {
  const uniqueUrls = new Map();
  for (const metadata of loadedLocales) {
    uniqueUrls.set(metadata.supportUrl, 'Support URL');
    uniqueUrls.set(metadata.marketingUrl, 'Marketing URL');
    uniqueUrls.set(metadata.privacyUrl, 'Privacy URL');
  }
  uniqueUrls.set(submission.eula, 'EULA URL');
  for (const [url, label] of uniqueUrls) await probeUrl(url, label);
}

for (const warning of warnings) console.warn(`WARN: ${warning}`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}

console.log('App Store metadata validation: PASS');
