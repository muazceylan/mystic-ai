# Search Console Monitoring Playbook

## Weekly Checks (Every Monday)

1. **Coverage report** → filter by "Error" and "Excluded"
   - New errors since last week?
   - Are any priority URLs in "Excluded"?

2. **Core Web Vitals** → "Poor URLs" count trending up or down?

3. **Performance (last 7 days)**
   - Total clicks and impressions — week-over-week change
   - Top queries for TR pages (filter: country = Turkey or lang = tr)
   - Top queries for EN pages (filter: lang = en or country = non-TR)
   - Click-through rate on top 10 queries

4. **New URLs** — any unexpected URLs indexed? (check for admin panel URLs, staging, test pages)

## Monthly Checks (First Monday of Each Month)

1. **Sitemap status** → Sitemaps tab → check for errors, submission count vs discovered count
2. **Index coverage** → trend of "Valid" URLs over 3 months
3. **Locale split** → are both `/` (TR) and `/en` pages indexed?
4. **Blog index rate** → submitted blog URLs vs indexed count
5. **New article performance** — check impressions/clicks for articles published last month
6. **hreflang validation** → International Targeting tab → any hreflang errors?

## TR / EN Split Monitoring

- Property: Add both as separate URL prefixes OR use site-wide property
- If site-wide property: use "Pages" filter with `/en/` to isolate EN performance
- Set up comparison: TR vs EN impressions/clicks in Performance report

## Priority URLs to Monitor Manually

| URL | Check |
|---|---|
| `/` | Indexed? Canonical correct? |
| `/en` | Indexed? lang="en" detected? |
| `/astroloji` | In top 10 for "astroloji" queries? |
| `/en/astrology` | In top 10 for "astrology" queries? |
| `/blog` | Listed pages count increasing? |
| `/en/blog` | EN posts indexed? |
| Latest TR article | Indexed within 3 days? |
| Latest EN article | Indexed within 3 days? |

## After Publishing a New Blog Post

1. Go to Search Console → URL Inspection
2. Enter full URL (e.g. `https://info.astroguru.app/blog/my-new-post`)
3. Click "Request Indexing"
4. Wait 24–72h, re-inspect
5. Also request the EN counterpart: `https://info.astroguru.app/en/blog/my-new-post`

## Sitemap Resubmission

Resubmit sitemap when:
- New pages are added (new feature pages)
- New blog posts are published in bulk
- URL structure changes

How: Sitemaps tab → enter `sitemap.xml` → Submit

## Index Problem Types and Actions

| Problem | Cause | Action |
|---|---|---|
| Discovered - currently not indexed | Low authority or crawl budget | Request indexing; improve internal linking |
| Crawled - currently not indexed | Thin content or duplicate | Improve content; check canonical |
| Duplicate without user-selected canonical | Missing canonical tag | Add canonical tag in metadata |
| Alternate page with proper canonical | Expected for EN/TR pairs | Normal; verify hreflang is correct |
| Blocked by robots.txt | robots.txt disallows | Check robots.ts; unblock if needed |
| Excluded by noindex | noindex meta tag | Remove noindex from public pages |
| Wrong locale indexed | Wrong hreflang or lang attr | Fix html lang + hreflang |
