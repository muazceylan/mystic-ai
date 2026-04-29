# Public Web Verification Runbook

Bu runbook, `mystic-web` deploy edildikten sonra iki seyi dogrulamak icin kullanilir:

1. Sunucuda gercekten `mystic-web` mi calisiyor?
2. Google tarafinda indexlenme hazirligi ve fiili index durumu ne?

## 1. Hazirlik

Production env'de en az su degiskenler dogrulanmis olmali:

- `NEXT_PUBLIC_SITE_URL=https://info.astroguru.app`
- `GOOGLE_SITE_VERIFICATION=<google-code>`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID=<optional>`
- `NEXT_PUBLIC_ENABLE_ANALYTICS=true|false`
- `CMS_API_BASE_URL=<optional>`
- `CMS_API_TOKEN=<optional>`
- `REVALIDATION_SECRET=<required for webhook test>`

## 2. Otomatik Smoke Test

Deploy sonrasi:

```bash
cd mystic-web
BASE_URL=https://info.astroguru.app EXPECTED_SITE_URL=https://info.astroguru.app pnpm seo:smoke
```

`REVALIDATION_SECRET` biliniyorsa success-path testi de acilir:

```bash
cd mystic-web
BASE_URL=https://info.astroguru.app \
EXPECTED_SITE_URL=https://info.astroguru.app \
REVALIDATION_SECRET=<secret> \
pnpm seo:smoke
```

Script su kontrolleri yapar:

- `/` ve `/en` -> `200`
- HTML gercek Next/SEO metadata iceriyor mu
- canonical ve hreflang dogru host'u mu gosteriyor
- `robots.txt` HTML fallback degil mi
- `sitemap.xml` HTML fallback degil mi
- `logo.png` ve `/opengraph-image` erisilebilir mi
- `/blog` ve `/en/blog` fallback/seed icerigi gosterebiliyor mu
- `/api/revalidate` secret olmadan `401` veriyor mu
- Secret verilirse success JSON donuyor mu
- Yanlislikla Expo / `react-native-web` shell servis ediliyor mu

## 3. Hizli Manuel HTTP Kontrolleri

```bash
curl -I https://info.astroguru.app/
curl -I https://info.astroguru.app/en
curl -I https://info.astroguru.app/robots.txt
curl -I https://info.astroguru.app/sitemap.xml
curl -s https://info.astroguru.app/ | head -40
curl -i -X POST https://info.astroguru.app/api/revalidate
```

Beklenen:

- `robots.txt` ve `sitemap.xml` kendi dogru content-type'i ile donmeli
- `/api/revalidate` Next route ise secret olmadan `401` vermeli
- HTML icinde `react-native-web` reset'i gorulmemeli

Yanlis deploy sinyalleri:

- `/robots.txt` ve `/sitemap.xml` HTML donuyorsa
- tum URL'ler ayni statik HTML'i donuyorsa
- HTML kaynakta `react-native-web` reset'i varsa
- `/api/revalidate` `404` ise

Bu durumda `info.astroguru.app` host'unda `mystic-web` yerine baska bir surface servis ediliyor olabilir.

## 4. Search Console Kurulumu

1. [Google Search Console](https://search.google.com/search-console)'da `https://info.astroguru.app` property acin.
2. DNS TXT ile verify edin.
3. `sitemap.xml` gonderin.
4. Su URL'leri tek tek inspect edin:
   - `https://info.astroguru.app/`
   - `https://info.astroguru.app/astroloji`
   - `https://info.astroguru.app/numeroloji`
   - `https://info.astroguru.app/ruya-yorumu`
   - `https://info.astroguru.app/en`
   - gerekiyorsa `/blog` ve son blog URL'leri
5. Her kritik URL icin `Request Indexing` gonderin.

## 5. Google'da Indexlendigini Nasil Anlariz

Bir URL icin en guclu kanit:

- Search Console > URL Inspection sonucunda `URL is on Google`

Yardimci sinyaller:

- Pages/Coverage raporunda indexed/valid durumu
- Performance raporunda impression gorulmesi
- `site:info.astroguru.app` aramasi

Not:
`site:` aramasi sonuc vermiyorsa bu tek basina "index yok" kaniti degildir. Esas karar Search Console verisine gore alinmali.

## 6. Kabul Kriterleri

Sunucu tarafi:

- `/`, `/en`, `/robots.txt`, `/sitemap.xml` beklenen icerikle donuyor
- public sayfalarda 500 yok
- canonical/hreflang `info.astroguru.app` uzerinden uretiliyor
- `/api/revalidate` auth davranisi dogru

SEO/index tarafi:

- Search Console property verified
- `sitemap.xml` submit edildi ve `Success`
- home + en az 3 kritik URL icin `Request Indexing` gonderildi
- ana sayfa icin inspection sonucu `URL is on Google`
- admin/staging/test URL'leri indexlenmiyor
