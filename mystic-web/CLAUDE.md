# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Important:** This Next.js version (16.x) has breaking changes from earlier versions. Read `AGENTS.md` before writing framework-specific code.

## Commands

```bash
pnpm dev            # Dev server (http://localhost:3000)
pnpm build          # Production build — must pass before merging
pnpm lint           # ESLint
pnpm seo:check      # Validates html lang, hreflang, JSON-LD, noindex on live URLs
pnpm seo:smoke      # Lightweight smoke check
```

## Architecture

### Routing: TR at root, EN under `/en/`

TR pages live at root (`/astroloji`, `/blog/[slug]`, etc.) via the `(tr)` route group.  
EN pages live under `/en/` (`/en/astrology`, `/en/blog/[slug]`, etc.).

```
src/app/
  layout.tsx          ← single root layout — lang="tr" default + suppressHydrationWarning
  (tr)/
    layout.tsx        ← TR metadata + <Header> + <Footer>
    page.tsx
    astroloji/page.tsx
    blog/[slug]/page.tsx
    ...
  en/
    layout.tsx        ← EN metadata + <HeaderEn> + <FooterEn>
    page.tsx
    astrology/page.tsx
    blog/[slug]/page.tsx
    ...
  sitemap.ts          ← generates all TR+EN entries with hreflang alternates
  robots.ts
  api/revalidate/route.ts
```

Route pairs (TR ↔ EN) are the source of truth in `src/lib/i18n.ts` (`ROUTE_PAIRS`). Use `getMetadataAlternates(locale, trPath)` on every page for correct canonical + hreflang metadata.

### `html lang` Strategy

The root layout sets `lang="tr"` as default. `HtmlLanguageSync` (client component) runs `useEffect` to switch `document.documentElement.lang` to `'en'` when `pathname.startsWith('/en')`. `suppressHydrationWarning` on `<html>` prevents React mismatch warnings. This is documented in `docs/seo/HTML_LANG_STRATEGY.md`.

### `useSearchParams()` Rule

Any component using `useSearchParams()` **must** be wrapped in `<Suspense>` at its usage site, or the entire static generation tree will fail. Current usages: `LocaleSwitcher` — always render it as `<Suspense fallback={null}><LocaleSwitcher /></Suspense>` in headers.

`AnalyticsPageTracker` intentionally uses only `usePathname()` (not `useSearchParams()`) to stay static-generation-safe.

### Analytics Layer (`src/lib/analytics.ts`)

All GA4 calls go through typed helpers — never call `gtag()` directly from pages or components.

Key exports:
- `trackPageView(pathname, params)` — called automatically by `AnalyticsPageTracker`
- `dispatchAnalyticsInteraction(event, pathname)` — for user interactions; accepts `AnalyticsInteractionEvent` union (`cta_click | feature_click | blog_card_click | store_click | locale_switch`)
- `getAnalyticsContextFromPath(pathname)` — auto-derives `locale`, `page_type`, `content_group`
- Rewarded video funnel: `createRewardedVideoAnalyticsSession(params)` → returns session object with `.trackClick()/.trackStart()/.trackComplete()/.trackGrantResolution()`
- `trackAstroTokenRewardGranted()` must only fire after backend confirmation

Use `TrackedLink` / `TrackedAnchor` (from `src/components/TrackedLink.tsx`) for links that need analytics events.

### Store CTAs (`src/components/StoreCTA.tsx`)

Never hard-code `href="#"` for store buttons. `StoreCTA` checks `APP_STORE_URL` / `PLAY_STORE_URL` constants — if they equal `'#'` (env var not set), it renders a disabled "Coming Soon" state instead of a fake link.

### CMS + ISR

`src/lib/blog.ts` → tries `fetchPostsFromCms()` first, falls back to local `seedPosts`.  
`src/lib/cms.ts` → uses `CMS_API_BASE_URL` + `CMS_API_TOKEN` env vars.  
On-demand revalidation: `POST /api/revalidate` with `x-revalidation-secret` header.  
Body: `{ path?, slug?, locale?, translationGroup? }` — `translationGroup` revalidates listing pages for both locales.

### JSON-LD

`src/lib/jsonLd.ts` builds structured data. Use `<JsonLd>` component to inject into pages. Blog article pages should include `Article` schema.

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | No | Canonical base URL (default: `https://info.astroguru.app`) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | For analytics | GA4 ID |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | For analytics | Must be `"true"` to activate |
| `NEXT_PUBLIC_APP_STORE_URL` | For store CTAs | If unset, buttons show "Coming Soon" |
| `NEXT_PUBLIC_PLAY_STORE_URL` | For store CTAs | If unset, buttons show "Coming Soon" |
| `GOOGLE_SITE_VERIFICATION` | For Search Console | Meta tag verification |
| `CMS_API_BASE_URL` | For CMS | Falls back to seed data |
| `CMS_API_TOKEN` | For CMS | |
| `REVALIDATION_SECRET` | For ISR webhooks | Protects `/api/revalidate` |

## SEO Docs

The `docs/seo/` directory contains operational guides:
- `HTML_LANG_STRATEGY.md` — why and how `lang` attribute is managed
- `REWARDED_VIDEO_ANALYTICS_PLAN.md` — GA4 rewarded video funnel design
- `ASSET_GAPS.md` — missing assets/env vars checklist (apple-touch-icon, GA4, Search Console)
- `SEARCH_CONSOLE_MONITORING_PLAYBOOK.md`, `GA4_VALIDATION.md`, `CONTENT_PUBLISHING_PLAYBOOK.md`

Run `pnpm seo:check` against a live deployment to validate lang, hreflang, and structured data.
