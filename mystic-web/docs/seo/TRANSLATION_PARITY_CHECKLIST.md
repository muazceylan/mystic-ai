# Translation Parity Checklist

Use this checklist when verifying that a TR/EN content pair is complete and consistent.

## URL Pair Check

| Check | TR | EN |
|---|---|---|
| URL accessible (200 status) | `/blog/[slug]` | `/en/blog/[slug]` |
| Content is genuinely translated (not machine placeholder) | ✓ | ✓ |
| `slug` is the same in both (current convention) | ✓ | ✓ |

## Indexability Check

| Check | TR | EN |
|---|---|---|
| No noindex meta tag | ✓ | ✓ |
| URL in sitemap.xml | ✓ | ✓ |
| Canonical points to same-locale URL | `/blog/[slug]` | `/en/blog/[slug]` |
| hreflang `tr` points to TR URL | ✓ | ✓ |
| hreflang `en` points to EN URL | ✓ | ✓ |
| hreflang `x-default` points to TR URL | ✓ | ✓ |

## Locale Switch Check

| Check | Expected |
|---|---|
| Locale switch on TR page navigates to EN equivalent | `/en/blog/[slug]` |
| Locale switch on EN page navigates to TR equivalent | `/blog/[slug]` |
| No 404 on locale switch | Verified |
| No cross-language canonical (TR page canonicals to EN or vice versa) | Not present |

## Content Parity Check

| Check | TR | EN |
|---|---|---|
| Title is localized (not just translated, culturally appropriate) | ✓ | ✓ |
| `description` / meta is localized | ✓ | ✓ |
| Body content is fully in correct language | ✓ | ✓ |
| CTA text is localized | ✓ | ✓ |
| No mixed-language paragraphs | ✓ | ✓ |

## JSON-LD / Structured Data Check

| Check | TR | EN |
|---|---|---|
| Article JSON-LD present | ✓ | ✓ |
| `headline` matches page `<h1>` | ✓ | ✓ |
| `datePublished` is correct | ✓ | ✓ |
| `author` / `publisher` correct | ✓ | ✓ |

## Editorial Fields (Future CMS)

When using CMS editorial fields:
- `editorialStatus: 'published'` on both TR and EN versions
- `translationReviewed: true` on EN version (reviewed by native English speaker)
- `seoReviewed: true` on both
- Same `translationGroup` identifier on both records

## Failing Parity — Decision Matrix

| Situation | Action |
|---|---|
| TR published, EN not written yet | Do NOT mark TR as "has EN pair"; add to translation backlog |
| TR published, EN is machine-translated placeholder | Do NOT publish EN version; mark as draft |
| EN published, TR not yet written | Rare; TR should always be primary |
| Both published but content diverges significantly | Decide: update EN, or treat as separate articles with different slugs |
