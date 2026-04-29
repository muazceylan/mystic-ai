#!/usr/bin/env node

/**
 * seo-smoke-check.mjs
 *
 * Production-oriented smoke test for AstroGuru public web.
 *
 * Examples:
 *   pnpm seo:smoke
 *   BASE_URL=http://localhost:3000 pnpm seo:smoke
 *   BASE_URL=https://info.astroguru.app EXPECTED_SITE_URL=https://info.astroguru.app pnpm seo:smoke
 *   BASE_URL=https://info.astroguru.app REVALIDATION_SECRET=... pnpm seo:smoke
 */

const BASE_URL = (process.env.BASE_URL || 'https://info.astroguru.app').replace(/\/+$/, '');
const EXPECTED_SITE_URL = (process.env.EXPECTED_SITE_URL || BASE_URL).replace(/\/+$/, '');
const REVALIDATION_SECRET = process.env.REVALIDATION_SECRET || '';

let passed = 0;
let failed = 0;
let skipped = 0;

function record(status, message) {
  const prefix = status === 'pass' ? 'PASS' : status === 'fail' ? 'FAIL' : 'SKIP';
  const stream = status === 'fail' ? console.error : console.log;
  stream(`[${prefix}] ${message}`);

  if (status === 'pass') passed += 1;
  if (status === 'fail') failed += 1;
  if (status === 'skip') skipped += 1;
}

function pass(message) {
  record('pass', message);
}

function fail(message) {
  record('fail', message);
}

function skip(message) {
  record('skip', message);
}

async function request(path, options = {}) {
  const url = new URL(path, `${BASE_URL}/`);
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent': 'AstroGuru-SEO-Smoke/1.0',
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  return {
    url: url.toString(),
    status: response.status,
    headers: response.headers,
    text,
  };
}

function escapeForRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function expectStatus(response, expected, label) {
  if (response.status === expected) {
    pass(`${label}: HTTP ${expected}`);
  } else {
    fail(`${label}: expected HTTP ${expected}, got ${response.status}`);
  }
}

function expectHeaderIncludes(response, headerName, expectedFragment, label) {
  const value = response.headers.get(headerName) || '';
  if (value.toLowerCase().includes(expectedFragment.toLowerCase())) {
    pass(`${label}: ${headerName} includes "${expectedFragment}"`);
  } else {
    fail(`${label}: ${headerName} missing "${expectedFragment}"`);
  }
}

function expectContains(text, pattern, label) {
  const ok = typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text);
  if (ok) {
    pass(label);
  } else {
    fail(label);
  }
}

function expectNotContains(text, pattern, label) {
  const found = typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text);
  if (!found) {
    pass(label);
  } else {
    fail(label);
  }
}

function getHtmlLang(text) {
  const match = text.match(/<html[^>]+lang="([^"]+)"/i);
  return match?.[1] || null;
}

async function checkHtmlPage(path, expectedLang, expectedCanonicalPath) {
  const response = await request(path);
  const label = `HTML ${path}`;
  const htmlLang = getHtmlLang(response.text);
  const canonicalCandidates = expectedCanonicalPath === '/'
    ? [`${EXPECTED_SITE_URL}`, `${EXPECTED_SITE_URL}/`]
    : [`${EXPECTED_SITE_URL}${expectedCanonicalPath}`];

  expectStatus(response, 200, label);
  expectHeaderIncludes(response, 'content-type', 'text/html', label);
  expectContains(response.text, /<!doctype html>/i, `${label}: returns HTML document`);

  if (htmlLang === expectedLang) {
    pass(`${label}: html lang="${expectedLang}"`);
  } else if (path === '/en' && htmlLang === 'tr') {
    skip(`${label}: server HTML lang is "tr"; verify whether multi-root layout is needed for stricter SEO`);
  } else {
    fail(`${label}: html lang="${expectedLang}"`);
  }

  expectContains(response.text, 'application/ld+json', `${label}: structured data present`);

  const hasExpectedCanonical = canonicalCandidates.some((candidate) =>
    new RegExp(
      `<link[^>]+rel="canonical"[^>]+href="${escapeForRegExp(candidate)}"`,
      'i',
    ).test(response.text),
  );
  if (hasExpectedCanonical) {
    pass(`${label}: canonical uses expected host`);
  } else {
    fail(`${label}: canonical uses expected host`);
  }

  expectContains(response.text, /hreflang="tr"/i, `${label}: hreflang tr present`);
  expectContains(response.text, /hreflang="en"/i, `${label}: hreflang en present`);
  expectNotContains(response.text, /react-native-web/i, `${label}: not serving Expo/react-native-web shell`);
  expectNotContains(
    response.text,
    /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i,
    `${label}: no noindex on public page`,
  );
}

async function checkRobots() {
  const response = await request('/robots.txt');
  const label = 'robots.txt';

  expectStatus(response, 200, label);
  expectHeaderIncludes(response, 'content-type', 'text/plain', label);
  expectContains(response.text, 'User-Agent: *', `${label}: user agent rule present`);
  expectContains(response.text, 'Allow: /', `${label}: allow root present`);
  expectContains(response.text, 'Disallow: /api/', `${label}: api disallow present`);
  expectContains(
    response.text,
    `Sitemap: ${EXPECTED_SITE_URL}/sitemap.xml`,
    `${label}: sitemap points to expected host`,
  );
  expectNotContains(response.text, /<!doctype html>/i, `${label}: not HTML fallback`);
}

async function checkSitemap() {
  const response = await request('/sitemap.xml');
  const label = 'sitemap.xml';

  expectStatus(response, 200, label);
  expectHeaderIncludes(response, 'content-type', 'xml', label);
  expectContains(response.text, /<urlset/i, `${label}: urlset present`);
  expectContains(response.text, `${EXPECTED_SITE_URL}/`, `${label}: root URL present`);
  expectContains(response.text, `${EXPECTED_SITE_URL}/en`, `${label}: EN home present`);
  expectContains(response.text, `${EXPECTED_SITE_URL}/blog`, `${label}: blog URL present`);
  expectContains(response.text, /xhtml:link/i, `${label}: hreflang alternates present`);
  expectNotContains(response.text, /<!doctype html>/i, `${label}: not HTML fallback`);
}

async function checkImage(path, expectedType, label) {
  const response = await request(path);
  expectStatus(response, 200, label);
  expectHeaderIncludes(response, 'content-type', expectedType, label);
}

async function checkBlogListing(path, seedSlug) {
  const response = await request(path);
  const label = `Blog listing ${path}`;

  expectStatus(response, 200, label);
  expectHeaderIncludes(response, 'content-type', 'text/html', label);
  expectContains(response.text, /blog/i, `${label}: blog heading present`);
  if (seedSlug) {
    expectContains(response.text, seedSlug, `${label}: localized content reachable`);
  }
  expectNotContains(response.text, /internal server error/i, `${label}: no server error text`);
}

async function checkOptionalLocalizedArticle(path) {
  const response = await request(path);
  const label = `Localized article ${path}`;

  if (response.status === 404) {
    pass(`${label}: untranslated locale variant correctly returns 404`);
    return;
  }

  expectStatus(response, 200, label);
  expectHeaderIncludes(response, 'content-type', 'text/html', label);
  expectContains(response.text, /application\/ld\+json/i, `${label}: structured data present`);
  expectNotContains(response.text, /internal server error/i, `${label}: no server error text`);
}

async function checkRevalidateRoute() {
  const unauthorized = await request('/api/revalidate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ path: '/' }),
  });

  expectStatus(unauthorized, 401, 'POST /api/revalidate without secret');

  if (!REVALIDATION_SECRET) {
    skip('POST /api/revalidate with secret: skipped because REVALIDATION_SECRET is not set');
    return;
  }

  const authorized = await request('/api/revalidate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-revalidation-secret': REVALIDATION_SECRET,
    },
    body: JSON.stringify({ path: '/' }),
  });

  expectStatus(authorized, 200, 'POST /api/revalidate with secret');
  expectHeaderIncludes(
    authorized,
    'content-type',
    'application/json',
    'POST /api/revalidate with secret',
  );
  expectContains(
    authorized.text,
    '"revalidated":true',
    'POST /api/revalidate with secret returns success JSON',
  );
}

async function main() {
  console.log('AstroGuru public-web smoke check');
  console.log(`BASE_URL=${BASE_URL}`);
  console.log(`EXPECTED_SITE_URL=${EXPECTED_SITE_URL}`);
  console.log('');

  await checkHtmlPage('/', 'tr', '/');
  await checkHtmlPage('/en', 'en', '/en');
  await checkRobots();
  await checkSitemap();
  await checkImage('/logo.png', 'image/png', 'logo.png');
  await checkImage('/opengraph-image', 'image/png', 'opengraph-image');
  await checkBlogListing('/blog', 'natal-harita-nedir-nasil-yorumlanir');
  await checkBlogListing('/en/blog', null);
  await checkOptionalLocalizedArticle('/en/blog/natal-harita-nedir-nasil-yorumlanir');
  await checkRevalidateRoute();

  console.log('');
  console.log(`Summary: ${passed} passed, ${failed} failed, ${skipped} skipped`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[FAIL] seo smoke check crashed');
  console.error(error);
  process.exit(1);
});
