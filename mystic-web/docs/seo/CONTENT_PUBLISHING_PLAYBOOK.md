# Content Publishing Playbook

## Pre-Publish Checklist

### Content Quality
- [ ] Article is at least 600 words
- [ ] No placeholder text ("Lorem ipsum", "TODO", "Coming soon")
- [ ] Content is fully in the declared locale (no mixed TR/EN)
- [ ] Article is genuinely useful, not thin or duplicate
- [ ] No factual errors or obviously wrong astrological/numerological data

### Metadata
- [ ] `title` is unique, 50–60 characters, includes target keyword
- [ ] `description` is unique, 140–160 characters, enticing
- [ ] `slug` is URL-safe, kebab-case, matches title intent
- [ ] `publishedAt` date is correct ISO format (YYYY-MM-DD)
- [ ] `readingTime` is accurate (≈200 words/minute)
- [ ] `category` is correct: astroloji | numeroloji | ruya | spirituel | genel

### Technical
- [ ] Article JSON-LD renders correctly (check page source for `"@type":"Article"`)
- [ ] Canonical tag points to correct locale URL
- [ ] hreflang links are present if EN counterpart exists
- [ ] No noindex meta tag on the page
- [ ] Page loads on mobile (test with DevTools mobile viewport)

### Translation (if applicable)
- [ ] If this is a TR article, does an EN version exist or is it planned?
- [ ] If EN version exists: same `slug`, same `translationGroup`
- [ ] `translationReviewed: true` set when a native speaker has reviewed
- [ ] No machine-translated placeholder content published as final

---

## Post-Publish Checklist

### Immediate (0–1 hour)
- [ ] Article is accessible at `https://info.astroguru.app/blog/[slug]`
- [ ] Article is accessible at `https://info.astroguru.app/en/blog/[slug]` (if EN exists)
- [ ] Article appears on `/blog` listing page
- [ ] `sitemap.xml` includes the new URL (check manually or via seo:check script)

### Indexing Request (0–24 hours)
- [ ] Open Google Search Console → URL Inspection
- [ ] Request indexing for TR URL
- [ ] Request indexing for EN URL (if applicable)

### 48–72 Hour Follow-Up
- [ ] Re-inspect URL in Search Console
- [ ] URL status: "URL is on Google" (indexed) or "Discovered - not indexed" (needs more time)?
- [ ] If "Crawled - not indexed": revisit content quality

---

## Do NOT Publish

- Thin content (under 400 words with no real value)
- Mixed-language content (TR article with EN paragraphs)
- Placeholder translated text (Google Translate without editing)
- Incomplete translated articles (half-translated)
- Articles with weak or missing `title`/`description`
- Duplicate of an existing article with minor wording changes
- Articles with incorrect astrological/numerological information

---

## Sitemap Verification

After publishing, verify sitemap includes the new URL:

```bash
curl -s https://info.astroguru.app/sitemap.xml | grep "my-new-slug"
```

Or run the SEO check script against production:

```bash
BASE_URL=https://info.astroguru.app pnpm seo:check
```

---

## Analytics Verification

After publish, verify analytics in GA4 DebugView:
- Visit the new article
- Confirm `page_view` event fires with correct `locale` parameter
- Confirm `article_open` fires on first view (if implemented)
