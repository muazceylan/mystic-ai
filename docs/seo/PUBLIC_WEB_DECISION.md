# Public Web SEO Mimari Karar Dokumani

**Tarih:** 2026-04-17
**Durum:** Karar bekliyor
**Domain:** `https://astroguru.app`

---

## Problem

`astroguru.app` domain'i icin Google'da gorunecek public SEO web varligi henuz mevcut degil. Mobil uygulama app store'lardan indiriliyor, ancak organik arama trafigi icin web yuzeyi gerekli.

## Secenekler

### Secenek A: Ayri `mystic-web` Next.js Projesi (Onerilen)

Monorepo icinde yeni bir Next.js App Router projesi olusturulur.

**Artilari:**
- Tam SSR/SSG kontrolu — her sayfa icin optimal rendering stratejisi
- SEO metadata, structured data, Open Graph tam kontrol
- Core Web Vitals optimizasyonu bagimsiz yapilir
- Admin panel ile SEO kodu birbirine karismaz
- `ads.txt`, `sitemap.xml`, `robots.txt` dogru domain'de yasir
- Blog, landing page, CMS icerik sayfalari bagimsiz gelistirilir
- i18n (TR/EN) route bazli desteklenir
- Deploy pipeline'i bagimsiz olur

**Eksileri:**
- Yeni proje kurulum maliyeti
- Admin ve public arasinda shared type/component ihtiyaci olabilir

**Yapi ornegi:**
```
mystic-web/
  src/app/
    layout.tsx          # metadataBase, global SEO
    page.tsx            # Landing / hero
    robots.ts           # Public robots
    sitemap.ts          # Dynamic sitemap
    burclar/
      page.tsx          # Burc listesi (SSG)
      [slug]/page.tsx   # Burc detay (SSG)
    numeroloji/
      page.tsx          # Numeroloji landing
    blog/
      page.tsx          # Blog listesi
      [slug]/page.tsx   # Blog detay (ISR)
    hakkimizda/page.tsx
    gizlilik/page.tsx
    kullanim-sartlari/page.tsx
  public/
    ads.txt
    manifest.json
```

### Secenek B: Expo Web Target

Mevcut `mysticai-mobile` Expo projesi web target olarak deploy edilir.

**Artilari:**
- Ek proje yok
- Mobil ile ayni kod tabani

**Eksileri:**
- Expo web CSR (client-side rendering) uretir — SEO icin cok kotu
- SSR/SSG destegi yok
- `robots.txt`, `sitemap.xml` icin Expo native cozum yok
- Structured data, canonical URL, hreflang kontrolu zor
- Core Web Vitals skoru dusuk olur (buyuk JS bundle, hydration gecikmesi)
- Google crawler JavaScript-heavy SPA'lari tam render edemeyebilir

**Sonuc:** SEO acisindan uygun degil. App download link sayfasi (`/dl`) disinda public web icin kullanilmamali.

### Secenek C: Admin Projesine Public Route Eklemek

`mystic-admin` icine `/public/` route group'u eklenir.

**Artilari:**
- Ek proje yok
- SSR/SSG mevcut

**Eksileri:**
- Admin ve public SEO politikalari catisir (admin noindex, public index)
- `robots.txt` iki farkli politika uretmek zorunda kalir
- `ads.txt` admin domain'inde kalir
- Admin deploy'u public SEO'yu, public SEO deploy'u admin'i etkiler
- Guvenlik riski — admin route'lari public domain'den erisilebilir
- Domain ayrimi (`admin.` vs root) zorlasilir

**Sonuc:** Teknik borc ve guvenlik riski yarattigi icin onerilmez.

---

## Oneri

**Secenek A — Ayri `mystic-web` Next.js projesi.**

Gerekce:
1. SEO, SSR/SSG, structured data ve Core Web Vitals kontrolu icin en temiz yol
2. Admin ve public yasam dongusu birbirinden bagimsiz olur
3. CMS icerik sayfalari (burc, numeroloji, blog) ISR ile sunulabilir
4. `ads.txt` ve AdSense dogru domain'de yasir
5. i18n (`/tr/`, `/en/`) route bazli desteklenir
6. Gelecekte AMP, PWA, Web Stories gibi uzantilar eklenebilir

## Sonraki Adimlar (Karar sonrasi)

1. `mystic-web/` Next.js App Router projesi olustur
2. `metadataBase: 'https://astroguru.app'` ayarla
3. `robots.ts` — public route'lar index, private route'lar noindex
4. `sitemap.ts` — CMS icerik URL'leri dahil dynamic sitemap
5. Landing page + burc/numeroloji SEO sayfalari
6. `ads.txt` tasima
7. Google Search Console kaydi
8. Structured data (JSON-LD): Organization, WebApplication, FAQ, Article
9. Open Graph + Twitter Card
10. Hreflang TR/EN
