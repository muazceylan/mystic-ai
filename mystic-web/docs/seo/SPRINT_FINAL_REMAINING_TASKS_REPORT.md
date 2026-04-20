# Sprint Final — Remaining Tasks Report

**Date:** 2026-04-20

---

## Summary

All critical remaining SEO, analytics, locale, CMS, and store CTA hardening tasks completed in this sprint. The `mystic-web` public site is now production-hardened across:

- HTML lang correctness (multiple root layouts)
- Typed GA4 analytics with full rewarded video funnel helpers
- Store CTA guard (no fake `#` links)
- Blog editorial type extensions
- Locale-aware CMS revalidation (incl. `translationGroup`)
- SEO QA script
- Full documentation suite

---

## Files Created / Changed

### Code Changes

| File | Change |
|---|---|
| `src/app/(tr)/layout.tsx` | Promoted to root layout: `<html lang="tr">` + fonts + GoogleAnalytics + Header + Footer |
| `src/app/en/layout.tsx` | Promoted to root layout: `<html lang="en">` + fonts + GoogleAnalytics + HeaderEn + FooterEn |
| `src/app/layout.tsx` | **Deleted** — replaced by the two route-specific root layouts above |
| `src/components/StoreCTA.tsx` | New component — guards store links; shows "Coming Soon" if URL not configured |
| `src/app/(tr)/page.tsx` | Uses `StoreCTA` instead of `href="#"` |
| `src/app/en/page.tsx` | Uses `StoreCTA` instead of `href="#"` |
| `src/lib/analytics.ts` | Full rewrite with typed helpers for all events incl. rewarded video funnel |
| `src/lib/blog.ts` | Added `locale`, `translationGroup`, `editorialStatus`, `seoReviewed`, `translationReviewed` fields |
| `src/app/api/revalidate/route.ts` | Added `translationGroup` support; TypeScript type for body |
| `package.json` | Added `seo:check` script |
| `scripts/locale-seo-check.mjs` | New QA script: checks html lang, hreflang, Article JSON-LD, noindex, sitemap |

### Documentation Created

| File | Purpose |
|---|---|
| `docs/seo/HTML_LANG_STRATEGY.md` | Explains multiple root layout approach and verification |
| `docs/seo/REWARDED_VIDEO_ANALYTICS_PLAN.md` | Full funnel event definitions, parameters, security rules |
| `docs/seo/GA4_PANEL_SETUP.md` | Step-by-step GA4 panel configuration |
| `docs/seo/SEARCH_CONSOLE_MONITORING_PLAYBOOK.md` | Weekly/monthly GSC monitoring workflow |
| `docs/seo/URL_TRIAGE_GUIDE.md` | Decision matrix for each index problem type |
| `docs/seo/CONTENT_PUBLISHING_PLAYBOOK.md` | Pre/post publish checklist + editorial rules |
| `docs/seo/TRANSLATION_PARITY_CHECKLIST.md` | TR/EN pair verification checklist |
| `docs/seo/CMS_REVALIDATION_WORKFLOW.md` | Webhook setup, payload examples, translationGroup flow |
| `docs/seo/ASSET_GAPS.md` | Inventory of missing assets and configs |
| `docs/seo/GA4_VALIDATION.md` | DebugView validation guide for all events |
| `docs/seo/CONTENT_OPS_DASHBOARD_SPEC.md` | Weekly/monthly metrics spec |

---

## HTML Lang Strategy

**Status: Resolved.**

Before: `<html lang="tr">` hardcoded in root layout; EN pages used `<div lang="en">` wrapper (wrong).

After: `app/layout.tsx` deleted. `app/(tr)/layout.tsx` and `app/en/layout.tsx` are now independent root layouts with correct `lang` attributes.

Verification command:
```bash
curl -s http://localhost:3000 | grep -o '<html[^>]*>'
# <html lang="tr" ...>

curl -s http://localhost:3000/en | grep -o '<html[^>]*>'
# <html lang="en" ...>
```

---

## GA4 Event Hardening

**Status: Complete.**

All events are now typed in `src/lib/analytics.ts`:

```ts
trackLocaleSwitch()
trackFeatureClick()
trackBlogCardClick()
trackArticleOpen()
trackCtaClick()
trackStoreClick()
trackRewardedVideoClick()
trackRewardedVideoStart()
trackRewardedVideoComplete()
trackAstroTokenRewardGranted()  // ← fires only after backend confirmation
trackAstroTokenRewardFailed()
```

Guards:
- No event fires when analytics is disabled
- `store_click` will not fire if URL is missing (handled by `StoreCTA` component)
- `astro_token_reward_granted` explicitly requires backend-confirmed data by type contract

---

## Rewarded Video Funnel

**Status: Analytics layer complete. Backend integration pending.**

Frontend analytics helpers are in place. The backend reward grant endpoint (`POST /api/v1/rewards/grant`) is not yet built. Until then:

- Frontend fires `rewarded_video_click`, `rewarded_video_start`, `rewarded_video_complete`
- `astro_token_reward_granted` must be fired only after backend integration is complete
- Do NOT fire it on `rewarded_video_complete` alone

See `docs/seo/REWARDED_VIDEO_ANALYTICS_PLAN.md` for full spec.

---

## Search Console Monitoring

See `docs/seo/SEARCH_CONSOLE_MONITORING_PLAYBOOK.md` for full weekly/monthly workflow.

---

## Content Ops Playbooks

- `CONTENT_PUBLISHING_PLAYBOOK.md` — pre/post publish checklists
- `TRANSLATION_PARITY_CHECKLIST.md` — TR/EN pair verification
- `CONTENT_OPS_DASHBOARD_SPEC.md` — metrics spec

---

## CMS Revalidation Workflow

`translationGroup` field now supported in revalidation API. When a group of related articles is updated in CMS, posting `{ "translationGroup": "group-id" }` to `/api/revalidate` clears all listing caches for both locales.

See `docs/seo/CMS_REVALIDATION_WORKFLOW.md` for payload examples and webhook setup.

---

## Remaining Gaps

| Gap | Priority | Action Required |
|---|---|---|
| App Store URL | High | Set `NEXT_PUBLIC_APP_STORE_URL` in production env |
| Play Store URL | High | Set `NEXT_PUBLIC_PLAY_STORE_URL` in production env |
| GA4 Measurement ID | High | Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` in production env |
| apple-touch-icon | Medium | Add 180×180 PNG + link tag in both root layouts |
| Search Console verified | Medium | Verify ownership and submit sitemap |
| Backend reward endpoint | Medium | Required before `astro_token_reward_granted` can fire |
| `REVALIDATION_SECRET` | Medium | Set in production env for CMS webhook security |

---

## Next Recommended Work

1. **Set real store URLs** — unblocks store CTA activation and `store_click` analytics
2. **Set GA4 Measurement ID** — enables all analytics instrumentation
3. **Backend reward grant endpoint** — needed for complete rewarded video funnel
4. **Core Web Vitals optimization** — after indexing is stable, optimize LCP/CLS/INP
5. **Content scale-up** — add more articles (target: 4 TR + 2 EN per month)
6. **GA4 Looker Studio dashboard** — combine GSC + GA4 for weekly ops review
7. **apple-touch-icon** — small but visible gap for iOS bookmarks
8. **Search Console submission** — required for verified indexing monitoring
