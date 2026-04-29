# Google Search Console Kurulum Rehberi

**Domain:** `info.astroguru.app`
**Proje:** mystic-web

---

## 1. Search Console'a Property Ekleme

1. https://search.google.com/search-console adresine gidin
2. Sol ust kosedeki "Add property" butonuna tiklayin
3. "URL prefix" secenegini secin
4. `https://info.astroguru.app` girin ve "Continue" tiklayin

## 2. Domain Dogrulama

### Secenek A: DNS TXT Record (Onerilen)

1. Google size bir TXT record verecek, ornek:
   ```
   google-site-verification=xxxxxxxxxxxxxxxxxxxx
   ```
2. DNS saglayicinizda (Cloudflare, Route53, vb.) TXT record ekleyin:
   - Type: `TXT`
   - Name: `info` (veya `info.astroguru.app`)
   - Value: Google'in verdigi dogrulama string'i
3. DNS yayilimini bekleyin (genellikle 5-60 dakika)
4. Search Console'da "Verify" tiklayin

### Secenek B: HTML Meta Tag

1. Google size bir meta tag verecek:
   ```html
   <meta name="google-site-verification" content="xxxxxxxxxxxx" />
   ```
2. Production env'e `GOOGLE_SITE_VERIFICATION=xxxxxxxxxxxx` ekleyin.
3. Deploy edin ve Search Console'da "Verify" tiklayin.

### Secenek C: HTML Dosyasi

1. Google'in verdigi `googleXXXXXX.html` dosyasini indirin
2. `mystic-web/public/` klasorune koyun
3. Deploy edin ve Search Console'da "Verify" tiklayin

## 3. Sitemap Gonderme

Dogrulama tamamlandiktan sonra:

1. Search Console'da sol menuden "Sitemaps" secin
2. URL kutusuna `sitemap.xml` yazin
3. "Submit" tiklayin
4. Status: "Success" gorunene kadar bekleyin

Sitemap'in icerigi (9 URL):
```
https://info.astroguru.app/
https://info.astroguru.app/astroloji
https://info.astroguru.app/numeroloji
https://info.astroguru.app/ruya-yorumu
https://info.astroguru.app/uyum-analizi
https://info.astroguru.app/spirituel-rehberlik
https://info.astroguru.app/gizlilik
https://info.astroguru.app/kullanim-sartlari
https://info.astroguru.app/iletisim
```

## 4. URL Inspection

Sitemap gonderdikten sonra kritik URL'leri inspect edin:

1. Search Console ust arama cubuguna URL girin
2. "Request Indexing" tiklayin
3. Asagidaki URL'ler icin tekrarlayin:

Oncelikli URL'ler:
- `https://info.astroguru.app/`
- `https://info.astroguru.app/astroloji`
- `https://info.astroguru.app/numeroloji`
- `https://info.astroguru.app/ruya-yorumu`

Ikincil URL'ler:
- `https://info.astroguru.app/uyum-analizi`
- `https://info.astroguru.app/spirituel-rehberlik`
- `https://info.astroguru.app/iletisim`

Yasal sayfalar (dusuk oncelik, sitemap yeterli):
- `https://info.astroguru.app/gizlilik`
- `https://info.astroguru.app/kullanim-sartlari`

## 4.1 Deploy Sonrasi Teknik Smoke Test

Search Console adimlarina gecmeden once:

```bash
cd mystic-web
BASE_URL=https://info.astroguru.app EXPECTED_SITE_URL=https://info.astroguru.app pnpm seo:smoke
```

Bu script, public domainde gercekten `mystic-web` servis edilip edilmedigini ve `robots/sitemap/revalidate` akisinin beklendigi gibi davrandigini kontrol eder.

## 5. Index Durumu Takibi

### Ilk 7 Gun
- "Coverage" raporunu gunluk kontrol edin
- "Valid" URL sayisi 9'a ulasmali
- "Error" veya "Excluded" varsa nedenini inceleyin

### Ilk 30 Gun
- "Performance" raporunda ilk query'ler gorunmeli
- "Impressions" artmali
- "Average position" izlenmeli

### Olasi Sorunlar ve Cozumleri

| Sorun | Olasi Neden | Cozum |
|---|---|---|
| "Discovered - currently not indexed" | Sayfa henuz taranmadi | Bekleyin veya "Request Indexing" |
| "Crawled - currently not indexed" | Icerik yetersiz goruluyor | Icerik zenginlestirin |
| "Excluded by robots.txt" | robots.txt yanlis | robots.txt kontrol edin |
| "Soft 404" | Sayfa bos veya cok az icerik | Icerik ekleyin |
| "Redirect" | www/non-www redirect sorunu | DNS/hosting redirect kontrolu |

## 6. Ek Yapilandirmalar

### International Targeting
- Search Console > Legacy tools > International Targeting
- Country: Turkey secin (eger sadece TR hedefleniyorsa)

### Bing Webmaster Tools (Opsiyonel)
- https://www.bing.com/webmasters
- Google Search Console ile senkronize edilebilir (Import)
- Sitemap gonderme ayni adimlar

### Google Analytics Entegrasyonu (Sprint 5+)
- GA4 property olusturun
- `mystic-web/src/app/layout.tsx`'e GA script ekleyin
- Search Console ile GA4'u baglayin
