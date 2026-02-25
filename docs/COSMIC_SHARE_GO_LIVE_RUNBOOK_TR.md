# Cosmic Share / Synastry Go-Live Runbook (TR)

Bu doküman, son yaptığımız geliştirmelerden sonra production'a çıkmadan önce senin yapman gerekenleri adım adım anlatır.

Kapsam:

- Mobil: Paylaşım kartı (ViewShot), QR, galeri kaydetme
- Instagram Stories native paylaşım (`react-native-share`)
- Companion ekleme akışı için Google Places / Timezone entegrasyonu
- Universal link redirect (`https://mysticai.app/dl`)
- Backend: Flyway migration (synastry companion kolonları)
- QA / release sırası / riskler

## 1. Hızlı Özet (Önce Bunları Yap)

Minimum production checklist:

1. `mysticai-mobile/.env` oluştur ve `EXPO_PUBLIC_FACEBOOK_APP_ID` gir.
2. `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` (veya fallback `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`) tanımla.
3. `mysticai-mobile/public/dl/index.html` içindeki App Store / Google Play linklerini gerçek production linklerle değiştir.
4. Android package değerini production package ile doğrula (`mysticai-mobile/app.json` şu an test package içeriyor).
5. iOS ve Android için native rebuild al (`react-native-share` ve diğer native modüller için zorunlu).
6. Fiziksel cihazda QR okutma testi yap (iPhone + Android).
7. Fiziksel cihazda Instagram Story paylaşımı test et (Instagram kurulu cihaz).
8. Companion ekleme ekranında Google Places autocomplete + timezone doğrula.
9. Backend `astrology-service` deploy öncesi Flyway migration’ı staging’de doğrula.
10. Production rollout sonrası ilk 24 saatte paylaşım / hata loglarını izle.

## 2. Bu Sprintte Eklenen Şeyler (Referans)

### Mobil (Mystic AI Mobile)

- Story-format paylaşım kartı (`CosmicShareCard`)
- High-res PNG capture (`react-native-view-shot`)
- Native share (`expo-sharing`)
- Galeriye kaydet (`expo-media-library`)
- Branded QR (`react-native-qrcode-svg`)
- Instagram Stories native paylaşım (`react-native-share`) + fallback
- “Hazırlanıyor...” overlay (capture sırasında UX polish)

### Backend (Astrology Service)

- Synastry schema için yeni alanlar:
  - `person_a_id`, `person_b_id`
  - `person_a_type`, `person_b_type`
- Flyway migration ve backfill

## 3. Yapman Gerekenler (Detaylı)

### 3.1 Mobil Ortam Değişkenleri (Zorunlu)

Dosya:

- `mysticai-mobile/.env` (yoksa oluştur)
- örnek: `mysticai-mobile/.env.example`

Eklenmesi gerekenler:

```env
EXPO_PUBLIC_FACEBOOK_APP_ID=123456789012345
EXPO_PUBLIC_META_APP_ID=123456789012345
EXPO_PUBLIC_UNIVERSAL_DOWNLOAD_URL=https://mysticai.app/dl
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
```

Notlar:

- Kod önce `EXPO_PUBLIC_FACEBOOK_APP_ID`, yoksa `EXPO_PUBLIC_META_APP_ID` kullanır.
- `EXPO_PUBLIC_UNIVERSAL_DOWNLOAD_URL` şu anda ileride kullanılmak için eklendi; paylaşım kartı linki kodda `https://mysticai.app/dl` olarak ayarlı.
- `EXPO_PUBLIC_FACEBOOK_APP_ID` yanlış/boş olursa Instagram Story native injection bazı cihazlarda degraded çalışabilir (fallback share sheet devreye girer).
- Konum autocomplete tarafında uygulama önce `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`, yoksa `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` kullanır.

### 3.1.1 Google Places / Maps API Key Nereden Alınır? (Companion Lokasyon Alanı)

Bu anahtarlar şu özellikler için kullanılıyor:

- Kişi ekle/düzenle ekranında Google Places autocomplete
- Place details (lat/lng çözümleme)
- Time Zone API ile timezone tespiti (1 saat kayma hatalarını önlemek için)

Kod referansı:

- `mysticai-mobile/src/services/googlePlaces.service.ts`

Kullanılan endpoint’ler:

- `place/autocomplete/json`
- `place/details/json`
- `timezone/json`

Google Cloud Console adımları:

1. [Google Cloud Console](https://console.cloud.google.com/) aç.
2. Yeni bir project oluştur veya mevcut project’i seç.
3. Billing (faturalandırma) aktif et.
4. `APIs & Services` -> `Library` bölümüne git.
5. Şu API’leri enable et:
   - `Places API` (console görünümüne göre “Places API (New)” / “Places API” olabilir)
   - `Time Zone API`
6. `APIs & Services` -> `Credentials` bölümüne git.
7. `Create credentials` -> `API key` oluştur.
8. Anahtarı `.env` içine ekle:
   - `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=...`

Güvenlik önerisi (önemli):

1. En azından **API restrictions** uygula:
   - sadece `Places API` ve `Time Zone API`
2. Bu anahtar mobil client tarafından REST çağrılarında kullanıldığı için tamamen gizli değildir.
3. Uzun vadede daha güvenli çözüm:
   - Google çağrılarını backend üzerinden proxy etmek (quota + abuse kontrolü için)

### 3.2 Meta / Facebook App Kurulumu (Instagram Story için)

Instagram Stories native paylaşım için `react-native-share` tarafında `appId` veriyoruz. Bunun stabil çalışması için:

1. Meta for Developers üzerinden bir App oluştur / mevcut app’i kullan.
2. Facebook App ID’yi al.
3. `mysticai-mobile/.env` içine `EXPO_PUBLIC_FACEBOOK_APP_ID` olarak yaz.
4. Instagram kurulu fiziksel cihazda test et.

Önemli:

- Expo managed + native module kombinasyonunda gerçek doğrulama yalnızca device/build ile yapılır.
- Simulator üzerinde Instagram Story paylaşımı sağlıklı test edilemez.

### 3.3 Native Rebuild (Zorunlu)

Son eklenen native modüller:

- `react-native-share`
- `react-native-view-shot`
- `expo-media-library`

Bu yüzden yalnızca Metro restart yetmez.

Yapılması gereken:

1. iOS için:
   - `cd mysticai-mobile`
   - `npx expo run:ios`
2. Android için:
   - `cd mysticai-mobile`
   - `npx expo run:android`

EAS kullanıyorsan:

1. Development build
2. Staging/preview build
3. Production build

Not:

- `react-native-share` için CI/CD’de native cache temizliği gerekebilir (özellikle iOS Pods cache).

### 3.4 Universal Link Redirect (`/dl`) Finalizasyonu (Zorunlu)

Dosya:

- `mysticai-mobile/public/dl/index.html`

Bu dosyada şu değerleri production’a göre güncelle:

1. `IOS_URL`
   - Şu an placeholder: `id0000000000`
   - Gerçek App Store URL ile değiştir (örn: `https://apps.apple.com/app/mystic-ai/idXXXXXXXXXX`)
2. `ANDROID_URL`
   - Production Google Play URL ile değiştir
   - Paket adı `app.json` ile tutarlı olmalı
3. `FALLBACK_WEB_URL`
   - Ana web sitesi / landing URL (örn: `https://mysticai.app`)

#### Android package dikkat

`mysticai-mobile/app.json` şu an:

- `android.package = com.mysticai.app.test`

Production Play Store package farklıysa:

1. `app.json` production build config’ini güncelle
2. `/dl/index.html` içindeki `ANDROID_URL` package query param’ını production package ile eşleştir

### 3.5 `/dl` Route Yayına Alma (Domain tarafı)

QR kod `https://mysticai.app/dl` kullanıyor. Bu endpoint gerçekten erişilebilir olmalı.

İki seçenek var:

1. Statik hosting (önerilir)
   - `mysticai-mobile/public/dl/index.html` dosyasını web sunucunda `/dl` route’una serve et
2. Backend/web app içinde route
   - Aynı HTML/JS mantığını web katmanına taşı

Kontrol listesi:

1. `https://mysticai.app/dl` açılıyor mu?
2. iPhone Safari -> App Store’a gidiyor mu?
3. Android Chrome -> Google Play’e gidiyor mu?
4. Desktop -> fallback web’e gidiyor mu?
5. UTM paramları store URL’ye taşınıyor mu?

### 3.6 QR Kod Fiziksel Testi (Zorunlu)

Branded QR scan edilebilirliği teorik değil, fiziksel test ile doğrulanmalı.

Test planı:

1. iPhone kamera ile tara
2. Android kamera ile tara
3. Farklı ekran parlaklıklarında tara
4. Instagram Story screenshot üzerinden tara (compressed görüntü)
5. WhatsApp ile paylaşılmış görsel üzerinden tara

Başarısız olursa yapılacak tuning:

1. `logoSize` küçült (`CosmicShareCard.tsx`)
2. QR `size` artır
3. `quietZone` artır
4. QR çevresi kontrastını yükselt (arka shell beyaz alanı büyüt)

### 3.7 Instagram Story Native Sharing Testi (Zorunlu)

Test senaryoları:

1. Instagram kurulu + giriş yapılmış cihaz
   - “Instagram Story” butonu -> IG Stories composer açılmalı
2. Instagram kurulu değil
   - fallback share akışı devreye girmeli
3. Kullanıcı paylaşımı iptal eder
   - uygulama crash etmemeli
4. Meta App ID yanlış / eksik
   - fallback share çalışmalı (veya hata mesajı anlamlı olmalı)

Beklenen UX:

- Kullanıcı butona basınca “Hazırlanıyor...” overlay görünmeli
- Capture bitince native akış başlamalı
- UI takılmamalı / flicker olmamalı

### 3.7.1 Companion Lokasyon / Timezone Testi (Zorunlu)

Timezone doğruluğu sinastri ve natal derece hesaplarını etkiler. Özellikle DST (yaz saati) kaynaklı kaymaları yakalamak için test et:

1. “Kişi Ekle” -> konum autocomplete çalışıyor mu?
2. Yer seçince lat/lng + timezone geliyor mu?
3. Manuel konum yazınca eski timezone temizleniyor mu?
4. Aynı şehir için tekrar düzenle/kaydet sonrası chart stabil mi?
5. Türkiye dışı bir şehir (örn. Berlin / New York) ile timezone doğru mu?

Beklenti:

- Kaydedilen `SavedPersonRequest` içinde `timezone` dolu gelmeli (Google place selection kullanıldıysa)
- “1 saat off” problemi gözlenmemeli

### 3.8 App Store / Play Store İçin Son Kontroller

Store listing hazır değilse `/dl` yönlendirme kullanıcıyı boşa götürür.

Kontrol et:

1. App Store listing yayınlandı mı?
2. Google Play listing yayınlandı mı?
3. Bölge kısıtı var mı?
4. Beta/internal link yerine production link kullanılıyor mu?

### 3.9 Backend Flyway Migration Rollout (Zorunlu)

İlgili dosyalar:

- `astrology-service/src/main/resources/db/migration/V2__Add_Companion_Synastry_Columns.sql`
- `astrology-service/src/main/resources/application.yml`
- `astrology-service/pom.xml`

Production rollout sırası:

1. Staging DB backup al
2. Staging deploy et
3. Flyway migration loglarını kontrol et
4. Eski synastry kayıtlarında backfill alanları dolmuş mu kontrol et
5. API smoke test:
   - self vs companion
   - companion vs companion
6. Production DB backup/pitr hazırla
7. Production deploy et
8. Flyway migration sonucu doğrula

SQL doğrulama (örnek):

```sql
SELECT id, user_id, saved_person_id, person_a_id, person_b_id, person_a_type, person_b_type
FROM synastries
ORDER BY calculated_at DESC
LIMIT 20;
```

Beklenti (legacy kayıtlar için):

- `person_a_type = 'USER'`
- `person_b_type = 'SAVED_PERSON'`
- `person_a_id = user_id`
- `person_b_id = saved_person_id`

### 3.10 `ddl-auto` Konusu (Önemli Teknik Not)

`astrology-service/src/main/resources/application.yml` içinde şu an:

- `spring.jpa.hibernate.ddl-auto: update`

Production için öneri:

1. Flyway devreye girdikten sonra kademeli olarak `validate` veya `none` stratejisine geçmeyi planla.
2. Schema değişikliklerini yalnızca migration ile yönet.

Neden:

- `ddl-auto=update` + Flyway birlikte uzun vadede sürpriz schema drift yaratabilir.

## 4. QA Checklist (Release Öncesi)

### 4.1 Mobil Functional QA

1. Synastry sonucu oluşuyor mu?
2. “Paylaş” butonu PNG share açıyor mu?
3. “Instagram Story” butonu native akış/fallback çalıştırıyor mu?
4. “Galeriye Kaydet” izin + save akışı çalışıyor mu?
5. “Hazırlanıyor...” overlay düzgün görünüyor mu?
6. Düşük performanslı cihazda capture sonrası boş/yarım render oluşuyor mu?

### 4.2 Görsel QA (Share Card)

1. QR okunuyor mu?
2. Logo QR taramayı bozmuyor mu?
3. Türkçe karakterler düzgün görünüyor mu? (`Ayşe`, vb.)
4. Zodiac glyph’ler capture’da net mi?
5. Score ring retina kalitede mi?

### 4.3 Redirect QA (`/dl`)

1. `https://mysticai.app/dl`
2. `https://mysticai.app/dl?utm_source=instagram_story`
3. `https://mysticai.app/dl?ios=<test-url>&android=<test-url>` (QA override)

## 5. Release Sırası (Önerilen)

1. Store linkleri finalize et
2. `/dl` page deploy et
3. Mobile env (`EXPO_PUBLIC_FACEBOOK_APP_ID`) set et
4. Staging mobile build al ve test et
5. Staging backend deploy + Flyway doğrula
6. Production backend deploy
7. Production mobile release
8. Post-release monitoring

## 6. Monitoring / Observability (İlk 24 Saat)

Takip et:

1. Mobile crash logs (share/capture/Instagram path)
2. Google Places / timezone request error rate (varsa client logs / analytics)
2. `astrology-service` startup logs (Flyway migration success)
3. Synastry API error rate
4. `/dl` route erişim logları (varsa)
5. Kullanıcı geri bildirimleri (QR okunmuyor / Instagram açılmıyor)

## 7. Senden Gereken Net Bilgiler (Benim Patchleyebilmem İçin)

İstersen bunları bana gönder, ben doğrudan dosyalara final production değerlerini işlerim:

1. Gerçek App Store URL (veya App ID)
2. Gerçek Google Play URL
3. Production Android package adı
4. Meta/Facebook App ID
5. Google Cloud API key (Google Places + Time Zone için)
6. (Opsiyonel) `mysticai.app` web fallback URL’nin final path’i

## 8. İlgili Dosyalar (Hızlı Erişim)

Mobil paylaşım:

- `mysticai-mobile/src/app/(tabs)/natal-chart.tsx`
- `mysticai-mobile/src/components/Astrology/CosmicShareCard.tsx`
- `mysticai-mobile/.env.example`
- `mysticai-mobile/docs/SHARING_SETUP.md`

Universal link redirect:

- `mysticai-mobile/public/dl/index.html`

Backend migration:

- `astrology-service/src/main/resources/db/migration/V2__Add_Companion_Synastry_Columns.sql`
- `astrology-service/src/main/resources/application.yml`
- `astrology-service/pom.xml`
