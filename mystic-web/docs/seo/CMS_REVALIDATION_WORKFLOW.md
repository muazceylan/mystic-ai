# CMS Revalidation Workflow

## How ISR Revalidation Works

This site uses Next.js ISR (Incremental Static Regeneration). Pages are cached and served statically, with on-demand revalidation via webhook.

**Endpoint:** `POST https://astroguru.app/api/revalidate`

**Authentication:** `x-revalidation-secret` header must match `REVALIDATION_SECRET` env var.

**Never log or expose the revalidation secret.**

---

## Revalidation Scenarios

### 1. New Blog Post Published (both locales)

```json
POST /api/revalidate
x-revalidation-secret: <secret>

{
  "slug": "natal-harita-nedir-nasil-yorumlanir",
  "locale": "tr"
}
```

**Effect:** Invalidates `/blog/[slug]`, `/en/blog/[slug]`, `/blog`, `/en/blog`, `/`, `/en`.

---

### 2. Blog Post Updated (single slug)

Same as above — use `slug` payload. Both TR and EN variants of the slug will be revalidated.

---

### 3. Specific Path Revalidation

```json
POST /api/revalidate
x-revalidation-secret: <secret>

{
  "path": "/astroloji",
  "locale": "tr"
}
```

**Effect:** Invalidates `/astroloji` and its EN counterpart `/en/astrology`.

---

### 4. Translation Group Revalidation

When a group of related articles (same `translationGroup`) is updated:

```json
POST /api/revalidate
x-revalidation-secret: <secret>

{
  "translationGroup": "astroloji-temelleri"
}
```

**Effect:** Invalidates `/blog`, `/en/blog`, `/`, `/en` (listing pages).
Individual article pages will revalidate on next request via their own `revalidate` interval.

---

### 5. Full Blog Revalidation (no payload)

```json
POST /api/revalidate
x-revalidation-secret: <secret>

{}
```

**Effect:** Invalidates `/blog`, `/en/blog`, `/`, `/en`.

---

## Setting Up Webhook in CMS

Configure your CMS (Strapi, Contentful, custom) to call:

```
POST https://astroguru.app/api/revalidate
Content-Type: application/json
x-revalidation-secret: <your-secret>

{ "slug": "{{content.slug}}", "locale": "{{content.locale}}" }
```

Only fire on `publish` and `unpublish` events (not every save/draft update).

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `REVALIDATION_SECRET` | Server-side secret for webhook auth |
| `CMS_API_BASE_URL` | CMS API base URL (server-side only) |
| `CMS_API_TOKEN` | CMS API bearer token (server-side only) |

None of these should be `NEXT_PUBLIC_*`. They must stay server-side.

---

## Troubleshooting

| Problem | Check |
|---|---|
| `401 Invalid secret` | Wrong or missing `x-revalidation-secret` header |
| `500 Revalidation failed` | Malformed JSON payload |
| Page still shows stale content | Check ISR `revalidate` value in page file; minimum is 60s |
| EN page not updating | The endpoint revalidates both `/blog/slug` and `/en/blog/slug` on slug-based requests |
