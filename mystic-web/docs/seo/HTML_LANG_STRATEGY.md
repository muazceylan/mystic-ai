# HTML Lang Strategy

## Summary

The site uses a **single root layout** (`app/layout.tsx`) with `lang="tr"` as the server-side default. EN pages dynamically update the `html lang` attribute to `"en"` on the client via `HtmlLanguageSync` (a lightweight React component). The `html` element has `suppressHydrationWarning` to prevent React hydration mismatch warnings.

## Implementation

```
app/layout.tsx          ← Single root layout. lang="tr" server default.
                           Contains: fonts, globals.css, GoogleAnalytics,
                           HtmlLanguageSync, AnalyticsPageTracker
app/(tr)/layout.tsx     ← TR segment layout (Header, main, Footer)
app/en/layout.tsx       ← EN segment layout (HeaderEn, main, FooterEn)
```

### HtmlLanguageSync (src/components/HtmlLanguageSync.tsx)

```tsx
'use client';
useEffect(() => {
  document.documentElement.lang = pathname.startsWith('/en') ? 'en' : 'tr';
}, [pathname]);
```

This runs after hydration on every route change, ensuring:
- `/` and TR routes: `document.documentElement.lang = 'tr'`
- `/en/*` routes: `document.documentElement.lang = 'en'`

### Hydration Safety

`<html lang="tr" suppressHydrationWarning>` in the root layout prevents React warnings when the client-side lang update differs from the server-rendered value on EN pages.

## Trade-offs

| Signal | TR pages | EN pages |
|---|---|---|
| Server-rendered `html lang` | `"tr"` ✓ | `"tr"` (wrong, but updates client-side) |
| Client-side `html lang` (after hydration) | `"tr"` ✓ | `"en"` ✓ |
| `hreflang` alternates (metadata) | `tr` + `en` ✓ | `tr` + `en` ✓ |
| Visible content language | Turkish ✓ | English ✓ |

## Google's Perspective

Google uses the following signals to determine page language, in order of priority:
1. **`hreflang` alternates** (strongest signal) — correctly set for all pages
2. **Visible content language** — correct for all pages
3. **`<html lang>` attribute** — correct after hydration; server-side value is wrong for EN only
4. HTTP `Content-Language` header

Since Google's crawler reads the fully-rendered HTML (including JavaScript execution in many cases), and since `hreflang` is the primary signal, this approach is SEO-safe. The `div lang="en"` wrapper that existed before was a weaker signal; this implementation is strictly better.

## Alternative: Multiple Root Layouts

Next.js App Router supports multiple root layouts (one per route group with no top-level `app/layout.tsx`). This would give correct server-side `html lang` for all routes. However, this approach was rejected because:
- It duplicates font loading, `globals.css` imports, and Google Analytics across layouts
- It cannot share a single `AnalyticsPageTracker` instance

The `HtmlLanguageSync` approach achieves functionally equivalent results with simpler architecture.

## Verification

```bash
# Server-side HTML (TR home — lang="tr" both server and client)
curl -s http://localhost:3000 | grep -o '<html[^>]*>'
# → <html lang="tr" suppressHydrationWarning ...>

# Client-side (EN home — lang updates to "en" after hydration)
# Verify in browser DevTools: document.documentElement.lang === "en"
```
