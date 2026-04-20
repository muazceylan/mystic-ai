# HTML Lang Strategy

## Summary

TR pages render `<html lang="tr">`, EN pages render `<html lang="en">`.
This is achieved via **Next.js multiple root layouts** (route groups without a shared root `app/layout.tsx`).

## Implementation

```
app/
  (tr)/layout.tsx   ← root layout for all TR routes → <html lang="tr">
  en/layout.tsx     ← root layout for all EN routes → <html lang="en">
  api/              ← route handlers (no layout needed)
  robots.ts         ← special file (no layout needed)
  sitemap.ts        ← special file (no layout needed)
  opengraph-image.tsx ← special file (no layout needed)
```

`app/layout.tsx` was removed. Each route-group layout includes `<html>`, `<body>`, fonts, and `GoogleAnalytics`.

## Why This Works

Next.js App Router supports "multiple root layouts" when:
1. No top-level `app/layout.tsx` exists.
2. Each route group or directory that needs an HTML shell has its own `layout.tsx` with `<html>` and `<body>`.

API routes and special files (`robots.ts`, `sitemap.ts`, `opengraph-image.tsx`) do not require a wrapping HTML layout.

## Google Priority

Google uses the following signals to determine page language, in order of importance:
1. `hreflang` alternate links (canonical pair) — **highest signal**
2. Content language (visible text on page)
3. `<html lang>` attribute — **also important, now correctly set**
4. HTTP `Content-Language` header

The previous `<div lang="en">` wrapper on EN pages was a weak signal. The corrected `<html lang="en">` is the proper way to declare document language.

## Verification

```bash
# Local
curl -s http://localhost:3000 | grep -o '<html[^>]*>'
# → <html lang="tr" ...>

curl -s http://localhost:3000/en | grep -o '<html[^>]*>'
# → <html lang="en" ...>
```
