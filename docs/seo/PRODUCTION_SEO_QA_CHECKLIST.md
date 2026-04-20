# Production SEO QA Checklist

**Proje:** mystic-web (astroguru.app)
**Tarih:** 2026-04-18
**Durum:** Deploy oncesi QA tamamlandi

---

## 1. Pre-Deploy Checklist

### 1.1 Build Dogrulama

- [x] `pnpm build` basarili
- [x] `pnpm lint` clean (hata yok)
- [x] Tum 9 public sayfa static prerender
- [x] `robots.txt` route uretiliyor
- [x] `sitemap.xml` route uretiliyor
- [x] `opengraph-image` dynamic route uretiliyor

### 1.2 Route Dogrulama

| Route | Tipi | Durum |
|---|---|---|
| `/` | Landing | Static, OK |
| `/astroloji` | Feature SEO | Static, OK |
| `/numeroloji` | Feature SEO | Static, OK |
| `/ruya-yorumu` | Feature SEO | Static, OK |
| `/uyum-analizi` | Feature SEO | Static, OK |
| `/spirituel-rehberlik` | Feature SEO | Static, OK |
| `/gizlilik` | Legal | Static, OK |
| `/kullanim-sartlari` | Legal | Static, OK |
| `/iletisim` | Contact | Static, OK |

### 1.3 Meta Tag Dogrulama (Her Sayfa)

- [x] `<title>` unique ve 60 karakter altinda
- [x] `<meta name="description">` unique ve 160 karakter altinda
- [x] `<link rel="canonical">` dogru URL ile
- [x] `<meta property="og:title">` sayfa-spesifik
- [x] `<meta property="og:description">` sayfa-spesifik
- [x] `<meta property="og:url">` sayfa-spesifik
- [x] `<meta property="og:image">` 1200x630 PNG
- [x] `<meta name="twitter:card">` summary_large_image
- [x] `<html lang="tr">`

### 1.4 Structured Data Dogrulama

- [x] Landing: Organization JSON-LD
- [x] Landing: WebApplication JSON-LD
- [x] Feature sayfalar: WebPage + FAQPage JSON-LD
- [x] JSON-LD valid (schema.org uyumlu)

### 1.5 Dosya Dogrulama

- [x] `robots.txt` — Allow /, Disallow /api/, Sitemap link
- [x] `sitemap.xml` — 9 URL, dogru priority/frequency
- [x] `ads.txt` — Google AdSense publisher ID
- [x] `favicon.ico` mevcut

### 1.6 Security Header Dogrulama

- [x] `X-Content-Type-Options: nosniff`
- [x] `X-Frame-Options: DENY`
- [x] `Referrer-Policy: strict-origin-when-cross-origin`

---

## 2. Post-Deploy Checklist

Deploy sonrasi asagidaki kontrolleri production URL uzerinden yapin.

### 2.1 URL Erisilebilirlik

```bash
# Her sayfa 200 donmeli
curl -sI https://astroguru.app/ | head -1
curl -sI https://astroguru.app/astroloji | head -1
curl -sI https://astroguru.app/numeroloji | head -1
curl -sI https://astroguru.app/ruya-yorumu | head -1
curl -sI https://astroguru.app/uyum-analizi | head -1
curl -sI https://astroguru.app/spirituel-rehberlik | head -1
curl -sI https://astroguru.app/gizlilik | head -1
curl -sI https://astroguru.app/kullanim-sartlari | head -1
curl -sI https://astroguru.app/iletisim | head -1
```

### 2.2 SEO Dosya Dogrulama

```bash
# robots.txt dogru mu
curl -s https://astroguru.app/robots.txt

# sitemap.xml dogru mu
curl -s https://astroguru.app/sitemap.xml

# ads.txt dogru mu
curl -s https://astroguru.app/ads.txt

# OG image render ediyor mu
curl -sI https://astroguru.app/opengraph-image | head -5
```

### 2.3 Redirect Kontrolleri

```bash
# www → non-www redirect (301 beklenir)
curl -sI https://www.astroguru.app/ | grep -i location

# HTTP → HTTPS redirect (301 beklenir)
curl -sI http://astroguru.app/ | grep -i location
```

### 2.4 Meta Tag Kontrolleri

```bash
# Landing page meta taglari
curl -s https://astroguru.app/ | grep -oE '<title>[^<]+</title>'
curl -s https://astroguru.app/ | grep -oE '<link rel="canonical" href="[^"]+"'
curl -s https://astroguru.app/ | grep -oE '<meta property="og:image" content="[^"]+"'
```

### 2.5 Security Header Kontrolleri

```bash
curl -sI https://astroguru.app/ | grep -iE 'x-content-type|x-frame|referrer-policy'
```

### 2.6 Arac Dogrulama

Deploy sonrasi su araclari kullanarak kontrol edin:

1. **Google Rich Results Test**: https://search.google.com/test/rich-results
   - Her feature sayfasinin URL'ini test edin
   - FAQPage structured data gorunmeli

2. **Google PageSpeed Insights**: https://pagespeed.web.dev/
   - Mobil ve desktop skor kontrol edin
   - Core Web Vitals (LCP, FID, CLS) kontrol edin

3. **Meta Tag Debugger**:
   - Facebook: https://developers.facebook.com/tools/debug/
   - Twitter: https://cards-dev.twitter.com/validator

4. **Structured Data Validator**: https://validator.schema.org/
   - JSON-LD ciktisini dogrulayin

---

## 3. Bilinen Sinirlamalar

| Alan | Durum | Not |
|---|---|---|
| App Store URL | Placeholder (`#`) | Gercek store URL'leri eklenecek |
| Play Store URL | Placeholder (`#`) | Gercek store URL'leri eklenecek |
| `logo.png` | JSON-LD'de referans var ama dosya yok | Logo dosyasi eklenecek |
| Hreflang | Yok | Sprint 5+ icin planli (TR/EN) |
| Blog | Yok | Sprint 5+ icin planli |
| OG image | Tum sayfalar icin ayni gorsel | Sayfa-spesifik OG image Sprint 5+ |
