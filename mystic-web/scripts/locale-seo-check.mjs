#!/usr/bin/env node
/**
 * locale-seo-check.mjs — quick SEO/locale validation for AstroGuru web
 *
 * Run: pnpm seo:check
 * Or point at a local server: BASE_URL=http://localhost:3000 pnpm seo:check
 */

const BASE_URL = process.env.BASE_URL || 'https://astroguru.app';

const CHECKS = [
  { url: '/', desc: 'TR home' },
  { url: '/en', desc: 'EN home' },
  { url: '/astroloji', desc: 'TR astroloji' },
  { url: '/en/astrology', desc: 'EN astrology' },
  { url: '/blog', desc: 'TR blog listing' },
  { url: '/en/blog', desc: 'EN blog listing' },
  { url: '/blog/natal-harita-nedir-nasil-yorumlanir', desc: 'TR article (seed)' },
  { url: '/en/blog/natal-harita-nedir-nasil-yorumlanir', desc: 'EN article (seed)' },
  { url: '/sitemap.xml', desc: 'Sitemap' },
  { url: '/robots.txt', desc: 'Robots.txt' },
];

let passed = 0;
let failed = 0;

function pass(msg) {
  console.log(`  ✓  ${msg}`);
  passed++;
}

function fail(msg) {
  console.error(`  ✗  ${msg}`);
  failed++;
}

async function fetchPage(path) {
  const url = `${BASE_URL}${path}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'AstroGuru-SEO-Check/1.0' } });
    const text = await res.text();
    return { status: res.status, text, url };
  } catch (err) {
    return { status: 0, text: '', url, error: err.message };
  }
}

async function checkPage({ url, desc }) {
  console.log(`\n→ ${desc} (${url})`);
  const { status, text } = await fetchPage(url);

  if (status === 0) {
    fail(`Could not fetch (network error)`);
    return;
  }
  if (status !== 200) {
    fail(`HTTP ${status}`);
    return;
  }
  pass(`HTTP 200`);

  // Locale-specific checks
  if (url === '/') {
    if (/<html[^>]+lang="tr"/i.test(text)) pass('html lang="tr"');
    else fail('html lang="tr" missing');

    if (/hreflang/i.test(text)) pass('hreflang present');
    else fail('hreflang missing');

    if (/noindex/i.test(text)) fail('noindex found on TR home!');
    else pass('no noindex');
  }

  if (url === '/en') {
    if (/<html[^>]+lang="en"/i.test(text)) pass('html lang="en"');
    else fail('html lang="en" missing');

    if (/hreflang/i.test(text)) pass('hreflang present');
    else fail('hreflang missing');

    if (/noindex/i.test(text)) fail('noindex found on EN home!');
    else pass('no noindex');
  }

  if (url.startsWith('/blog/') && !url.startsWith('/en/')) {
    if (/"@type"\s*:\s*"Article"/i.test(text)) pass('Article JSON-LD present');
    else fail('Article JSON-LD missing');

    if (/canonical/i.test(text)) pass('canonical present');
    else fail('canonical missing');
  }

  if (url === '/sitemap.xml') {
    if (text.includes('/en/')) pass('EN URLs in sitemap');
    else fail('EN URLs missing from sitemap');

    if (text.includes('/blog/')) pass('Blog URLs in sitemap');
    else fail('Blog URLs missing from sitemap');

    if (text.includes('hreflang') || text.includes('xhtml:link')) pass('hreflang alternates in sitemap');
    else fail('hreflang alternates missing from sitemap');
  }

  if (url === '/robots.txt') {
    if (/sitemap/i.test(text)) pass('Sitemap directive present');
    else fail('Sitemap directive missing');
  }
}

async function main() {
  console.log(`\nAstroGuru SEO Check — ${BASE_URL}`);
  console.log('─'.repeat(50));

  for (const check of CHECKS) {
    await checkPage(check);
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('SEO check crashed:', err);
  process.exit(1);
});
