# Asset & Config Gap Report

Last updated: 2026-04-20

## Store URLs

| Asset | Status | Notes |
|---|---|---|
| App Store URL | **Missing** | `NEXT_PUBLIC_APP_STORE_URL` not set; CTAs show "Coming Soon" |
| Google Play URL | **Missing** | `NEXT_PUBLIC_PLAY_STORE_URL` not set; CTAs show "Coming Soon" |

**Action:** Once app is live on App Store / Play Store, set environment variables in deployment platform (Vercel, etc).

The store CTA components (`StoreCTA.tsx`) handle the missing-URL case gracefully — they render disabled "Coming Soon" states instead of fake `#` links.

## Logo

| Asset | Status | Notes |
|---|---|---|
| `public/logo.png` | Present | Verify it is production-quality (not placeholder) |
| favicon | Present (`src/app/favicon.ico`) | Verify matches brand |
| apple-touch-icon | **Missing** | No `apple-touch-icon` link in layouts |
| OG image | Present (`opengraph-image.tsx`) | Renders dynamically; no static file needed |

**Action for apple-touch-icon:** Add `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` to both root layouts, and place a 180×180 PNG at `public/apple-touch-icon.png`.

## Analytics

| Config | Status | Notes |
|---|---|---|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | **Not set in env** | Analytics disabled until set |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | **Not set** | Must be `"true"` to activate |

## Search Console

| Item | Status |
|---|---|
| Search Console property verified | Unknown — check with team |
| Sitemap submitted | Unknown — submit after go-live |
| International Targeting configured | Unknown — verify hreflang errors |

## CMS

| Config | Status |
|---|---|
| `CMS_API_BASE_URL` | Not set; using local seed data |
| `CMS_API_TOKEN` | Not set |
| `REVALIDATION_SECRET` | Not set |

**Action:** Set these when connecting to a headless CMS (Strapi, Contentful, or custom backend).

## Remaining Priority Actions

1. Set App Store and Play Store URLs in production env
2. Add apple-touch-icon asset and link
3. Set GA4 Measurement ID and enable analytics
4. Verify Search Console ownership
5. Submit sitemap in Search Console
6. Set `REVALIDATION_SECRET` for webhook security
