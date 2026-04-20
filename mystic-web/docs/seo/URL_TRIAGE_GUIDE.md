# URL Triage Guide

Quick reference for resolving each type of Search Console index issue.

## Discovered — Currently Not Indexed

**Symptom:** Google found the URL but has not crawled or indexed it yet.

**Root causes:**
- Low crawl priority (no internal links, low authority)
- Crawl budget exhausted on large site
- Recently published

**Actions:**
1. Request indexing via URL Inspection tool
2. Add internal links to this URL from higher-traffic pages
3. Ensure URL is in sitemap.xml
4. Wait 3–7 days, re-inspect

---

## Crawled — Currently Not Indexed

**Symptom:** Google crawled the page but chose not to index it.

**Root causes:**
- Thin content (short articles, near-duplicate)
- Content not in expected language
- Low quality signals

**Actions:**
1. Improve content length and depth
2. Ensure content language matches `html lang` attribute
3. Add more unique value (data, images, structured data)
4. Check for duplicate content (canonical mismatch)
5. Re-request indexing after content improvement

---

## Duplicate Without User-Selected Canonical

**Symptom:** Two similar pages; Google can't determine the canonical.

**Root causes:**
- Missing canonical tag
- Both TR and EN articles have identical content
- www vs non-www or trailing slash variants

**Actions:**
1. Verify `<link rel="canonical">` is present in page source
2. Check `getMetadataAlternates()` is called with correct locale and path
3. Ensure canonical points to correct locale (TR canonical on TR page, EN canonical on EN page)
4. Do not set canonical cross-locale (TR page should not canonical to EN page)

---

## Alternate Page With Proper Canonical

**Symptom:** URL shows as excluded because Google chose the canonical.

**Note:** This is NORMAL and EXPECTED for hreflang pairs. Each locale page should appear as "Alternate page with proper canonical tag" in the OTHER locale's perspective.

**When to investigate:** Only if the canonical is pointing to the wrong page.

**Actions:**
1. Click the URL in GSC → check which page is the "canonical"
2. Verify the canonical is the correct-locale version
3. Verify hreflang links both ways (TR→EN and EN→TR)

---

## Wrong Language Page Indexed

**Symptom:** A TR URL appears in English search results, or vice versa.

**Root causes:**
- `html lang` attribute was wrong (before the multiple root layouts fix)
- hreflang pointing to wrong URL
- Google may have cached old version

**Actions:**
1. Verify `html lang` is correct on the affected page
2. Verify hreflang alternates are correct in both directions
3. Request re-indexing via URL Inspection
4. Wait 1–2 weeks for Google to re-evaluate

---

## Hreflang Mismatch

**Symptom:** International Targeting report shows hreflang errors.

**Root causes:**
- TR page references an EN URL that returns 404
- EN page doesn't have a reciprocal hreflang back to TR
- Locale codes are wrong (e.g., `tr-TR` instead of `tr`)

**Actions:**
1. Check `getMetadataAlternates()` returns correct paths for both locales
2. Verify both URLs are accessible (200 status)
3. Verify `x-default` hreflang points to TR root (`/`)
4. Use Google's hreflang testing tool to validate

---

## Blocked by robots.txt

**Symptom:** Google cannot crawl the URL due to robots.txt rule.

**Actions:**
1. Check `src/app/robots.ts` for incorrect `disallow` rules
2. Ensure `/api/revalidate` is disallowed (correct)
3. Ensure public pages are NOT disallowed
4. Re-submit sitemap after fixing

---

## Excluded by noindex

**Symptom:** Page has noindex directive; Google respects it.

**Expected cases:** Admin panel pages (mystic-admin), internal tools.

**Unexpected cases:** Any public-facing page in mystic-web.

**Actions:**
1. Search for `noindex` in the page source
2. Check if `robots` metadata or HTTP header contains `noindex`
3. Verify the page layout doesn't accidentally add noindex
4. Fix and re-request indexing
