# Kozmik Map Geliştirme Günlüğü (Natal Chart v2.0)

Bu doküman, `Haritam / Kozmik Map` ekranı için yapılan geliştirmeleri, teknik kararları ve sıradaki adımları toplar.

Tarihsel not:
- Bu güncelleme serisi iki aşamada ilerliyor.
- İlk aşamada profesyonel görselleştirme + hesap doğruluğu iyileştirmeleri yapıldı.
- İkinci aşamada (bu dokümanla birlikte) AI natal yorumu yapılandırılmış JSON formatına geçirilmeye başlandı.

## 1. Tamamlanan Geliştirmeler (Özet)

### 1.1 Profesyonel Natal Harita Görselleştirme (Mobil UI)

`mysticai-mobile/src/components/Astrology/NatalChartProPanels.tsx` eklendi.

İçerik:
- SVG tabanlı natal wheel (harita çemberi)
- 12 burç segmenti
- Placidus ev çizgileri (mevcut backend house data üzerinden)
- Gezegen işaretleri (glyph) + derece etiketleri
- Etkin açılar için iç çemberde aspect line çizimleri
- Aspekt matrisi (üçgen grid görünüm)
- Element & nitelik “Kozmik Denge” paneli

Profesyonelleştirme notları:
- Aspect matrix içinde sadece orb sınırı içinde kalan açılar gösteriliyor.
- Orb değerleri hücre içinde kısa formatta gösteriliyor.
- Görsel dil mevcut temaya uyumlu tutuldu (light/dark aware renkler).

### 1.2 Aspekt Matrisi (The Grid) – Orb Odaklı

Yeni matrix paneli:
- `Kavuşum (☌)`
- `Altıgen (⚹)`
- `Kare (□)`
- `Üçgen (△)`
- `Karşıt (☍)`

Özellikler:
- Üçgen matris düzeni
- Orb değeri gösterimi
- Aspekt hücresine basınca mevcut `AspectBottomSheet` açılır
- Backend’den aspect gelmezse (legacy veri) lokal fallback hesaplama yapılır

### 1.3 Element & Nitelik Analizi (Kozmik Denge)

Element analizi:
- Ateş / Toprak / Hava / Su

Nitelik analizi:
- Öncü / Sabit / Değişken

Hesap yaklaşımı:
- Kişisel gezegenler (Güneş, Ay, Merkür, Venüs, Mars) daha yüksek ağırlıklı
- Jenerasyon gezegenleri daha düşük ağırlıklı
- Yükselen burç ekstra ağırlıkla dahil edilir (denge paneli için)

Ek çıktı:
- Kural tabanlı kısa yorum (şu aşamada LLM değil, deterministic heuristik)

### 1.4 Self Natal Chart Hesap Doğruluğu İyileştirmesi (Backend + Mobil Request)

Önceki durum:
- Self chart hesaplaması `birthLocation` string ile parse ediliyor, `timezone/lat/lon` path’i kullanılmıyordu.

Yeni durum:
- Mobil `calculateNatalChart` request’i opsiyonel `timezone`, `latitude`, `longitude` gönderiyor (varsa)
- Backend request DTO bu alanları kabul ediyor
- `AstrologyService.calculateAndSaveNatalChart(...)` hesapları bu verilerle yapıyor
- `utcOffset` artık timezone-aware helper ile hesaplanıyor

Kazanım:
- Özellikle Türkiye dışı kullanıcılar için saat dilimi doğruluğu artar
- Degree / house / ascendant sonuçları daha güvenilir hale gelir

### 1.5 AI Natal Yorum Tonu (Scientific Warmth)

`ai-orchestrator` tarafında natal yorum prompt’una aşağıdaki ton kuralları eklendi:
- `Sen / Biz` dili (resmi “Siz” yerine)
- Teknik doğruluk + psikolojik sıcaklık dengesi
- Teknik kavramların günlük hayat örnekleriyle açıklanması
- Gezegen yorumlarında mikro-yapı (Giriş / Karakter / Derinlik / Hayat Senaryosu)
- Kaderci ve kesin hüküm veren dilden kaçınma

### 1.6 AI Natal Yorumu – Structured JSON Geçişi (Adım 3 Başlangıcı)

Bu dokümanda başlatılan yeni faz:
- NATAL_CHART AI response artık JSON beklenen response tipleri arasına alındı
- Natal prompt’u JSON-only çıktı üretmeye yönlendirildi
- Mobil tarafta JSON parse edilip kartlı UI olarak render ediliyor
- JSON parse edilemezse eski düz metin render (`StaggeredAiText`) fallback devam ediyor

Bu sayede:
- Backend migration yapmadan (`aiInterpretation` string alanı korunarak) structured render mümkün oldu
- Eski yorumlar bozulmadan çalışır

### 1.7 "Doğduğun Gece" Poster Modülü (v1)

Yeni paylaşılabilir poster akışı eklendi:
- `BirthNightSkyPoster` (minimal siyah/altın estetik poster)
- `NightSkyPosterPreviewScreen` (önizleme + paylaşım aksiyonları)
- `night-sky-poster-preview` route
- `natal-chart` ekranından draft store ile veri taşıma

v1 özellikleri:
- 9:16 story uyumlu poster tasarımı
- Deterministik yıldız dokusu (aynı doğum verisinde aynı kompozisyon karakteri)
- Natal gezegen noktaları (house axis referanslı yerleşim)
- 5’li Moon Phase görsel seti + aktif faz vurgusu
- Slogan + shareable link + QR alanı
- Yüksek çözünürlüklü PNG capture (`1080x1920`)
- PDF export / sistem paylaşımı / Instagram Story / galeri kaydetme

Veri hassasiyeti notu:
- Bu sürüm, mevcut natal chart verisini kullanarak doğum anına duyarlı bir sky composition üretir.
- Tam astronomik `zenith-centered` yıldız haritası (gerçek yıldız katalog + horizontal projection)
  için backend tarafında ek sky projection endpoint’i gerekir (sonraki faz).

## 2. Teknik Detaylar (Bu Tur)

### 2.1 AI Orchestrator – NATAL_CHART JSON Response Beklentisi

Dosya:
- `ai-orchestrator/src/main/java/com/mysticai/orchestrator/service/MysticalAiService.java`

Değişiklik:
- `expectsJsonResponse(...)` içine `NATAL_CHART` eklendi

Etkisi:
- Model cevabında JSON dışı preamble olsa bile ilk JSON object extract edilir
- Natal structured response mobile parser’a daha temiz ulaşır

### 2.2 Natal Prompt – JSON Şema Tanımı

Dosya:
- `ai-orchestrator/src/main/java/com/mysticai/orchestrator/prompt/MysticalPromptTemplates.java`

Yeni JSON şeması (özet):
- `version: "natal_v2"`
- `tone`
- `opening`
- `coreSummary`
- `sections[]`
- `planetHighlights[]`
- `closing`

Neden bu şema:
- UI tarafında bölüm bölüm render edilebilir
- Gezegen yorumları ayrı kartlarda gösterilebilir
- Sonraki fazlarda analytics/personalization için uygun

### 2.3 Mobil – Structured Natal AI Renderer

Yeni bileşen:
- `mysticai-mobile/src/components/Astrology/StructuredNatalAiInterpretation.tsx`

Davranış:
- `aiInterpretation` içinden JSON object bloğunu bulmaya çalışır
- Parse başarılıysa:
  - Kozmik özet kartı
  - Yorum bölümleri kartları
  - Gezegen rehberi kartları
  - Kapanış notu
- Parse başarısızsa:
  - Eski `StaggeredAiText` ile düz metin render

Bu yaklaşımın avantajı:
- Zero-downtime geçiş
- Legacy veriler desteklenir
- Yeni LLM çıktıları daha “tasarlanmış” görünür

### 2.4 Poster Generator – Capture / Export Akışı

Preview ekranı yaklaşımı:
- Hidden `ViewShot` canvas üzerinde poster render edilir
- Otomatik PNG oluşturulur
- Üretilen PNG, paylaşım için ayrı cache klasörüne kopyalanır (`night-sky-share`)
- Kullanıcı önizleme ekranında şu aksiyonları kullanır:
  - Sistem paylaşımı (PNG)
  - Instagram Story
  - Galeriye kaydet
  - PDF olarak paylaş

Teknik not:
- Mevcut `useGenerateMatchImage` hook’u, capture boyutu ve cache klasörü parametreleri alacak şekilde genişletildi.
- Match card akışı bozulmadan korunur.

### 2.5 Poster Görselleştirme Mantığı (v1)

Poster bileşeni:
- `mysticai-mobile/src/components/Astrology/BirthNightSkyPoster.tsx`

İç mantık:
- Doğum verisinden deterministik seed üretilir
- Seed ile yıldız noktaları + ince “constellation-like” çizgiler üretilir
- Gezegenler natal longitude + local house axis referansıyla kubbeye yerleştirilir
- Moon phase doğum zamanından hesaplanır ve 5’li faz setinde vurgulanır

Bu tasarım, paylaşılabilir estetik poster + veri duyarlılığı arasında pratik bir v1 denge sağlar.

## 3. Değişen / Eklenen Dosyalar

### Mobil (UI + Data Contract)

- `mysticai-mobile/src/components/Astrology/NatalChartProPanels.tsx` (yeni)
- `mysticai-mobile/src/components/Astrology/StructuredNatalAiInterpretation.tsx` (yeni)
- `mysticai-mobile/src/components/Astrology/BirthNightSkyPoster.tsx` (yeni)
- `mysticai-mobile/src/app/(tabs)/natal-chart.tsx`
- `mysticai-mobile/src/app/night-sky-poster-preview.tsx` (yeni)
- `mysticai-mobile/src/screens/astrology/NightSkyPosterPreviewScreen.tsx` (yeni)
- `mysticai-mobile/src/services/astrology.service.ts`
- `mysticai-mobile/src/store/useAuthStore.ts`
- `mysticai-mobile/src/store/useNightSkyPosterStore.ts` (yeni)
- `mysticai-mobile/src/hooks/useGenerateMatchImage.ts` (capture config desteği)

### Astrology Service (Backend)

- `astrology-service/src/main/java/com/mysticai/astrology/dto/NatalChartRequest.java`
- `astrology-service/src/main/java/com/mysticai/astrology/service/AstrologyService.java`
- `astrology-service/src/main/java/com/mysticai/astrology/service/NatalChartCalculator.java`

### AI Orchestrator

- `ai-orchestrator/src/main/java/com/mysticai/orchestrator/service/MysticalAiService.java`
- `ai-orchestrator/src/main/java/com/mysticai/orchestrator/prompt/MysticalPromptTemplates.java`

## 4. Doğrulama / Test Notları

Çalıştırılan doğrulama:
- `mvn -pl astrology-service,ai-orchestrator -am -DskipTests compile` → `BUILD SUCCESS`

Mobil TypeScript notu:
- Projede önceden var olan unrelated type hataları nedeniyle `npx tsc --noEmit` genel olarak fail oluyor.
- Yeni eklenen structured natal yorum bileşeni fallback mantığıyla güvenli çalışacak şekilde yazıldı.
- Poster modülü eklendikten sonra da TS hata listesi aynı pre-existing dosyaları göstermeye devam ediyor (yeni poster dosyaları görünmüyor).

## 5. Açık Kalanlar (Sıradaki Tasklar)

Sıralı ilerleme planı:

1. `Doğduğun Gece` poster generator (SVG/Canvas + export PNG/PDF)
   - Durum: v1 tamamlandı
   - Kalan: gerçek yıldız kataloğu + tam zenith-centered projection backend desteği
2. AI natal JSON response backend tarafında opsiyonel validasyon/normalizasyon
3. Structured natal yorum için section bazlı analytics (hangi bölüm okundu, hangi gezegen kartı açıldı)
4. Kozmik denge yorumunu LLM destekli hale getirme (şu an heuristik)
5. Natal wheel için label collision çözümü ve zoom/tooltip etkileşimleri

## 6. Ürün / UX Notları (Tavsiye)

Sonraki adım için öneri:
- `Structured natal yorum` bileşenine küçük bir “Sekmeler” yapısı eklenebilir:
  - `Özet`
  - `Bölümler`
  - `Gezegenler`

Neden:
- Çok uzun yorumlarda scroll yorgunluğunu azaltır
- Kullanıcı doğrudan ilgilendiği katmana gider
- Paywall / premium varyantları için daha temiz bir kapı sunar

## 7. Poster v1.1 (Gerçek Zenith Projection + Share Token + Varyantlar)

Bu fazda `Doğduğun Gece` poster modülü v1’den v1.1 seviyesine yükseltildi.

### 7.1 Backend – Gerçek Zenith Projection Endpoint (Swiss Ephemeris Horizontal Coords)

Yeni endpoint:
- `POST /api/v1/astrology/posters/night-sky/projection`

Amaç:
- Doğum anındaki gökyüzünü gerçek `horizontal coordinates` (Azimuth / Altitude) ile hesaplamak
- Poster bileşenine `zenith-centered` normalize koordinatlar (`xNorm`, `yNorm`) sağlamak

Teknik yaklaşım:
- `SwissEph.swe_calc_ut(...)` ile gezegen ekliptik konumları
- `SwissEph.swe_azalt(..., SE_ECL2HOR, ...)` ile ufuksal koordinata dönüşüm
- Azimut dönüşümü: SwissEph convention → `north=0, east=90`
- Azimuthal equidistant projection (merkez = Zenith)
- `ASC / DSC / MC / IC` axis noktaları da aynı projection modelinde döndürülür
- Ay fazı (`MoonPhaseInfo`) Sun-Moon elongation üzerinden hesaplanır (5’li set uyumu için)

Not:
- Normalize radial değer `0..1` aralığına clamp edilir; horizon altı noktalar poster diskinin dışına taşmaz.
- Bu endpoint şu aşamada gezegenler + ana eksenler (`ASC/DSC/MC/IC`) döndürür; arka plan yıldız katalog/constellation verisi henüz dahil değildir.

Yeni/eklenen backend dosyaları:
- `astrology-service/src/main/java/com/mysticai/astrology/dto/NightSkyProjectionRequest.java`
- `astrology-service/src/main/java/com/mysticai/astrology/dto/NightSkyProjectionResponse.java`
- `astrology-service/src/main/java/com/mysticai/astrology/service/NightSkyPosterService.java`
- `astrology-service/src/main/java/com/mysticai/astrology/controller/AstrologyController.java`

### 7.2 Backend – Poster için Kişiye Özel Share Token / Short-Link

Yeni endpoint’ler:
- `POST /api/v1/astrology/posters/night-sky/share-link`
- `GET /api/v1/astrology/posters/night-sky/share/{token}`

Kazanım:
- Poster için kişiye özel, varyant bilgisi içeren, süreli (`ttl`) share token üretilir
- Token resolve endpoint’i ile web share landing page / mobile restore akışı için payload okunabilir

Token payload içinde saklanan alanlar (özet):
- kullanıcı / chart referansı (varsa)
- isim, doğum tarihi-saati, konum
- `timezone`
- poster `variant`

Veritabanı:
- `poster_share_tokens` tablosu eklendi (Flyway migration)

Yeni/eklenen backend dosyaları:
- `astrology-service/src/main/java/com/mysticai/astrology/dto/NightSkyPosterShareLinkRequest.java`
- `astrology-service/src/main/java/com/mysticai/astrology/dto/NightSkyPosterShareLinkResponse.java`
- `astrology-service/src/main/java/com/mysticai/astrology/dto/NightSkyPosterShareTokenResolveResponse.java`
- `astrology-service/src/main/java/com/mysticai/astrology/entity/PosterShareToken.java`
- `astrology-service/src/main/java/com/mysticai/astrology/repository/PosterShareTokenRepository.java`
- `astrology-service/src/main/resources/db/migration/V4__Create_Poster_Share_Tokens.sql`

### 7.3 Mobil – Poster Varyantları (Minimal / Constellation / Gold Edition)

Poster önizleme ekranına stil seçici eklendi:
- `minimal`
- `constellation_heavy`
- `gold_edition`

Davranış:
- Varyant değişince:
  - backend’den yeni projection/share-link senkronizasyonu çalışır
  - poster yeniden capture edilerek önizleme güncellenir
- Backend projection başarısızsa lokal fallback kompozisyon ile çalışmaya devam eder
- Share link üretilemezse poster yine oluşur, varsayılan link fallback kullanılır

Poster bileşeni (`BirthNightSkyPoster`) v1.1 iyileştirmeleri:
- `projection` prop desteği (backend `xNorm/yNorm` kullanımı)
- `variant` prop desteği (renk, yıldız yoğunluğu, çizgi yoğunluğu, altın/soğuk ton varyasyonları)
- Moon phase gösteriminde backend faz verisi varsa onu kullanır (fallback korunur)
- `Zenith projection • Swiss Ephemeris` rozet satırı

Mobil dosya değişiklikleri (v1.1):
- `mysticai-mobile/src/services/astrology.service.ts`
- `mysticai-mobile/src/store/useNightSkyPosterStore.ts`
- `mysticai-mobile/src/app/(tabs)/natal-chart.tsx`
- `mysticai-mobile/src/components/Astrology/BirthNightSkyPoster.tsx`
- `mysticai-mobile/src/screens/astrology/NightSkyPosterPreviewScreen.tsx`

### 7.4 Doğrulama (v1.1)

- `mvn -pl astrology-service -am -DskipTests compile` → `BUILD SUCCESS`
- Mobil `npx tsc --noEmit` genel proje seviyesinde hâlâ pre-existing hatalar içeriyor.
- Filtreli kontrol içinde yeni poster dosyaları için ek TypeScript hata çıktısı görülmedi.

## 8. Poster v1.2 (Public Share Landing + Yıldız Katalog Projection + Abuse Guard)

Bu fazda paylaşılabilir poster akışı sadece token üretmekten çıkarılıp, token üzerinden tekrar açılabilen public landing deneyimine genişletildi.

### 8.1 Public Share Landing Page (Web/Mobile Route)

Yeni route:
- `mysticai-mobile/src/app/share/night-sky/[token].tsx`

Yeni ekran:
- `mysticai-mobile/src/screens/astrology/NightSkyPosterPublicShareScreen.tsx`

Akış:
1. URL token alınır (`/share/night-sky/{token}`)
2. Backend `resolve` endpoint ile token payload okunur
3. Token geçerliyse backend `projection` endpoint çağrılır
4. Poster `BirthNightSkyPoster` ile yeniden render edilir (restore)

Özellikler:
- Expired token durumunda bilgilendirme ekranı
- `429` rate-limit durumunda kullanıcıya açıklayıcı hata
- `Astro Guru'da Aç` (deep-link fallback mantığı)
- Sistem paylaşımı ile link paylaşma butonu

Not:
- Public landing, posteri `projection` verisi üzerinden restore eder.
- Natal `houses/planets` dizileri token içinde tutulmadığı için poster bileşeni projection-only fallback ile gezegenleri çizecek şekilde genişletildi.

### 8.2 Gerçek Yıldız Katalog Projection (Hipparcos/BSC Bright Subset)

Backend `NightSkyProjectionResponse` genişletildi:
- `starCatalog`
- `stars[]`
- `constellationLines[]`

Hesap yaklaşımı:
- Hipparcos/BSC bright-star subset (J2000 koordinatları) backend içinde tanımlı
- `SwissEph.swe_azalt(..., SE_EQU2HOR, ...)` ile RA/Dec → horizontal coords (azimuth/altitude)
- Sonuçlar zenith-centered normalize koordinatlara (`xNorm/yNorm`) dönüştürülür
- `constellationLines` yıldız anahtarları üzerinden istemciye gönderilir

Mobil poster etkisi:
- Backend `stars + constellationLines` varsa procedural yıldız dokusunun yerine/üstüne gerçek katalog noktaları çizilir
- `constellation_heavy` varyantında katalog çizgileri + hafif procedural dolgu birlikte kullanılır
- `minimal` varyantta daha temiz katalog sky görünümü korunur

Teknik doğruluk notu:
- Bu sürüm J2000 subset koordinatları kullanır (precession/nutation star-by-star advanced correction yapılmıyor).
- Poster estetiği ve doğum-anı ufuksal yerleşimi için pratik ve güvenilir bir orta katman sağlar.

### 8.3 Backend Abuse Guard / Rate-Limit

Yeni servis:
- `astrology-service/src/main/java/com/mysticai/astrology/service/PosterEndpointGuardService.java`

Korunan endpoint’ler:
- `projection`
- `share-link`
- `share resolve`

Koruma türü:
- IP bazlı in-memory sliding window rate-limit
- Uygun endpoint’lerde ek user bazlı limit
- Public resolve için `IP + token` ek limiti (scraping / brute force azaltma)

Kullanıcı davranışı:
- Limit aşımında `429 Too Many Requests`
- Kullanıcıya kısa süre beklemesini söyleyen mesaj

### 8.4 Scheduled Cleanup (Token + Guard Buckets)

Eklenen scheduled işler:
- `NightSkyPosterService.cleanupExpiredPosterShareTokensScheduled()`
  - süresi geçmiş token kayıtlarını periyodik temizler
- `PosterEndpointGuardService.cleanupBuckets()`
  - rate-limit sayaç map’inde boşalmış bucket’ları temizler

Kazanım:
- Uzun süreli memory birikimi azaltılır
- Token tablosunda gereksiz birikim kontrol altında tutulur

### 8.5 Bu Fazda Değişen / Eklenen Dosyalar (Özet)

Backend:
- `astrology-service/src/main/java/com/mysticai/astrology/dto/NightSkyProjectionResponse.java` (star catalog alanları)
- `astrology-service/src/main/java/com/mysticai/astrology/service/NightSkyPosterService.java` (bright-star subset projection + scheduled cleanup)
- `astrology-service/src/main/java/com/mysticai/astrology/service/PosterEndpointGuardService.java` (yeni)
- `astrology-service/src/main/java/com/mysticai/astrology/controller/AstrologyController.java` (guard entegrasyonu)

Mobil:
- `mysticai-mobile/src/services/astrology.service.ts` (projection response star types)
- `mysticai-mobile/src/components/Astrology/BirthNightSkyPoster.tsx` (catalog star render + projection-only planet fallback)
- `mysticai-mobile/src/screens/astrology/NightSkyPosterPublicShareScreen.tsx` (yeni)
- `mysticai-mobile/src/app/share/night-sky/[token].tsx` (yeni route)

## 9. Pro-Grade Kozmik Harita & Akıllı Analiz Paneli (Accordion + Big Three + Derin Analiz)

Bu fazda doğum haritası ekranı statik “uzun liste” görünümünden, odak-temelli ve etkileşimli bir bilgi mimarisine taşındı.

### 9.1 Accordion (Açılır/Kapanır) Mimari

Hedef:
- Sayfada sadece kullanıcının o an odaklandığı bölümün açık kalması
- Uzun içeriklerde gezinmeyi kolaylaştırmak
- Teknik ve görsel blokları anlamlı başlıklara bölmek

Uygulama:
- `AccordionSection` bileşeni eklendi (`react-native-reanimated` layout transition + fade animasyonları)
- `natal-chart` ekranındaki ana bloklar accordion’a dönüştürüldü:
  - `Doğduğun Gece` (poster modülü)
  - Harita özeti (profil summary)
  - Big Three
  - Kozmik Odak Noktaları
  - Profesyonel natal harita paneli
  - Gezegen konumları
  - Açı listesi
  - Ev konumları
  - AI yorumu
- Scroll sırasında en yakın accordion başlığını otomatik odaklayacak basit auto-focus mantığı eklendi

Not:
- Kullanıcı manuel olarak da accordion açıp kapatabilir.
- Auto-focus mantığı “tek odak” hissi sağlar; scroll esnasında aktif bölümü dinamik günceller.

### 9.2 "Doğduğun Gece" Posterinin Üst Modüle Taşınması

Eski durum:
- Poster sadece alt tarafta bir CTA butonu olarak görünüyordu.

Yeni durum:
- `Doğduğun Gece` modülü sayfanın üst kısmına accordion olarak taşındı
- Accordion açıldığında posterin küçük önizlemesi gösterilir
- “Poster Atölyesini Aç” butonu ile tam ekran poster preview / export ekranına geçilir

Kazanım:
- Poster artık sayfanın dekoratif eki değil, ana bilgi mimarisinin parçası oldu
- Kullanıcı önce görseli görür, sonra aksiyona geçer

### 9.3 İnteraktif Big Three (Güneş, Ay, Yükselen)

Yeni davranış:
- Big Three ikon kartları pasif görünümden `Pressable` hale getirildi
- Her karta tıklandığında `BigThreeBottomSheet` açılır

Bottom sheet içeriği:
- Rol bazlı giriş (Güneş / Ay / Yükselen)
- Element + Nitelik pill’leri
- Kart yapısında açıklamalar:
  - Karakter Analizi
  - Seni Nasıl Etkiler?
  - Günlük Hayat ve İlişkiler
  - Dikkat Etmen Gerekenler
- Öne çıkan temalar chip’leri

Amaç:
- “Tek paragraf” yorum yerine parça parça, sindirilebilir bilgi sunmak
- Kullanıcıyı Big Three kavramıyla daha sezgisel tanıştırmak

### 9.4 Açı Dereceleri ve Teknik İfadelerin İnsanileştirilmesi

Sorun:
- Ön yüzde `90.1°` gibi ham açı dereceleri anlamsız görünüyordu.

Çözüm:
- `astroLabelMap` yardımcı dosyası eklendi
- `formatAspectAngleHuman(...)` ile açıları kullanıcı dostu biçime dönüştürme:
  - hedef açıya yakınlık
  - orb bilgisi
  - daha anlamlı kısa açıklama
- `labelAspectType(...)` ile aspect enum adları daha zengin Türkçe etiketlere çevrildi
  - örn. `CONJUNCTION -> Kavuşum (Güç Birliği)`

Uygulanan yerler:
- Kozmik hotspot kartları
- Aspect bottom sheet
- Açı listesi etiketleri

### 9.5 Natal Wheel & Aspect Grid Etiketleme İyileştirmeleri

Amaç:
- Sadece ikon gören kullanıcının neye baktığını anlamasını kolaylaştırmak

Yapılanlar (`NatalChartProPanels`):
- Natal wheel üzerinde burç gliflerinin altına burç isimleri eklendi
- Gezegen noktalarında kısa isim etiketleri gösterildi
- Aspect matrix başlıklarında ikon + kısa isim birlikte gösterilmeye başlandı
- Erişilebilirlik (`accessibilityLabel`) metinleri daha açıklayıcı hale getirildi

Not:
- Bu sürüm temel etiketleme problemini çözer.
- Yakın derecelerde çakışan gezegen label’ları için ileri seviye collision/stacking algoritması sonraki iyileştirme adımı olarak önerilir.

### 9.6 Derinlemesine Gezegen & Ev Analizi (Line-by-Line Hiyerarşi)

Gezegen detayları:
- `PlanetBottomSheet` yeniden düzenlendi
- Satır hiyerarşisi (kart yapısı) eklendi:
  - ✨ Karakter Analizi
  - 🚀 Seni Nasıl Etkiler?
  - ⚠️ Dikkat Etmen Gerekenler
  - 🌟 Öne Çıkan Özellikler
- Teknik kavramların (ev teması vb.) daha açıklayıcı verilmesi güçlendirildi

Ev detayları:
- `HouseBottomSheet` eklendi
- House grid hücreleri `Pressable` yapıldı
- Her ev için:
  - basit başlangıç açıklaması (“2. Ev: değerler, para ve maddi güvenlik”)
  - satır bazlı etki/kontrol/yetenek yorumları
  - glossary destekli detay metin

### 9.7 AI Yorum Yapısı: Başlık Temizleme + Kartlı/Bullet Render Hazırlığı

Mobil render tarafı (`StructuredNatalAiInterpretation`) geliştirildi:
- Teknik başlık/kod temizleme (`cleanAstroHeading`)
- `SUN_TRINE_MARS`, snake_case vb. başlıkları kullanıcı dostu hale getirme
- Yeni JSON alanlarını tolere edecek parser:
  - `sections[].bulletPoints[]`
  - `planetHighlights[].analysisLines[]`
- Bullet/kart blokları ile daha hiyerarşik görünüm

Sonuç:
- LLM eski format döndürse bile fallback korunur
- Yeni format geldiğinde otomatik daha zengin UI render edilir

### 9.8 AI Prompt Refactor (Başlık + Bullet Şeması)

`ai-orchestrator` natal prompt güncellendi:
- `sections[].bulletPoints[]` örnek şeması eklendi
- `planetHighlights[].analysisLines[]` örnek şeması eklendi
- Kullanıcıya gösterilecek başlıklarda şu kurallar zorlandı:
  - Türkçe olmalı
  - teknik enum / snake_case / ALL_CAPS olmamalı
  - kullanıcı dostu tema başlıkları kullanılmalı

Örnek başlık yönlendirmeleri:
- `Duygusal Zeka`
- `Kariyer Potansiyeli`
- `İlişki Dinamiği`

Ek iyileştirme:
- `replaceTurkishTerms(...)` içine bazı eksik aspect çevirileri eklendi (Kare, Karşıt, Quincunx vb.)

### 9.9 Bu Fazda Değişen / Eklenen Dosyalar (Özet)

Mobil (yeni):
- `mysticai-mobile/src/constants/astroLabelMap.ts`
- `mysticai-mobile/src/components/ui/AccordionSection.tsx`
- `mysticai-mobile/src/components/Astrology/BigThreeBottomSheet.tsx`
- `mysticai-mobile/src/components/Astrology/HouseBottomSheet.tsx`

Mobil (güncellenen):
- `mysticai-mobile/src/app/(tabs)/natal-chart.tsx`
- `mysticai-mobile/src/components/ui/index.ts`
- `mysticai-mobile/src/components/Astrology/NatalChartProPanels.tsx`
- `mysticai-mobile/src/components/Astrology/StructuredNatalAiInterpretation.tsx`
- `mysticai-mobile/src/components/Astrology/PlanetBottomSheet.tsx`
- `mysticai-mobile/src/components/Astrology/AspectBottomSheet.tsx`
- `mysticai-mobile/src/components/Astrology/CosmicHotspotCard.tsx`

Backend (güncellenen):
- `ai-orchestrator/src/main/java/com/mysticai/orchestrator/prompt/MysticalPromptTemplates.java`
- `ai-orchestrator/src/main/java/com/mysticai/orchestrator/service/MysticalAiService.java`

### 9.10 Accordion Auto-Focus (Scroll-End) İyileştirmesi

Sorun:
- Scroll sırasında sürekli `onScroll` tabanlı auto-focus, accordion başlıklarında gereksiz hareket/jitter hissi yaratabiliyordu.

İyileştirme:
- Auto-focus tetikleme `scroll end` olaylarına taşındı:
  - `onScroll`: sadece son Y pozisyonu takip edilir
  - `onScrollEndDrag`: kısa gecikmeyle odak hesaplanır
  - `onMomentumScrollEnd`: momentum bittikten sonra net odak seçilir

Ek detay:
- Küçük bir timer queue kullanılarak duplicate tetiklemeler (drag end + momentum end) normalize edildi
- Böylece “aktif bölüm” geçişi daha sakin ve kararlı hale geldi

Kazanım:
- Daha az jitter
- Kullanıcının odaklandığı accordion bölümünü daha tutarlı açma davranışı

### 9.11 Big Three Mikro Radar Chart (Görsel Hızlı Okuma)

`BigThreeBottomSheet` içine yeni bir “Mikro Kozmik Profil” alanı eklendi.

İçerik:
- Mini radar chart (SVG)
- Sağ tarafta skorlu legend bar’lar
- Rol + element + nitelik sentezinden türetilen hızlı okuma metrikleri:
  - Kimlik
  - Sezgi
  - İfade
  - Uyum
  - İnisiyatif

Amaç:
- Uzun metin okumadan önce “hangi tema daha güçlü” hissini görsel olarak vermek
- Big Three modülünü daha interaktif ve zengin hale getirmek

Not:
- Bu radar chart kesin astrolojik ölçüm değil; UI/UX odaklı, rol+burç teması bazlı görsel özet katmanıdır.

### 9.12 Backend Natal JSON Validator / Normalizer (Schema Guard)

Problem:
- LLM bazen eksik alanlı, bozuk veya legacy formatta JSON döndürebilir.
- Mobil taraf structured render beklediği için alanların stabil olması kritik.

Çözüm:
- `MysticalAiService` içine backend-side `normalizeNatalChartJson(...)` eklendi
- `NATAL_CHART` cevaplarında:
  1. JSON extract
  2. Natal schema normalize/validate
  3. (locale uygunsa) Turkish term replacement

Normalize edilen alanlar:
- `version`, `tone`, `opening`, `coreSummary`, `closing`
- `sections[]` (id/title/body/dailyLifeExample/bulletPoints)
- `planetHighlights[]` (planetId/title/intro/character/depth/dailyLifeExample/analysisLines)

Ek güvenlik:
- Parse başarısızsa fallback `natal_v2` JSON envelope üretilir
- Mobil ekran çökmeden yorum “recovery” modunda gösterilebilir

Kazanım:
- Structured AI yorum ekranında schema kaynaklı render kırılmaları azalır
- Prompt disiplinine ek olarak backend katmanında ikinci güvenlik ağı oluşur

## 10. Pro-Kozmik Harita & Akışkan UI (V3) — Faz 1 (Hero + Perf + Dinamik Kombinasyon)

Bu faz, V3 hedeflerinin temel yapı taşlarını hazırlamak için başlatıldı. İlk iterasyonda odak:
- sabit hero referans paneli,
- akordiyon performans iyileştirmesi (lazy/deferred render),
- gezegen/ev yorumlarında dinamik üçlü kombinasyon mantığı,
- AI prompt tarafında kombinasyon odaklı anlatım zorlaması.

### 10.1 Sabit Hero (Kozmik Kart + Kişi Bilgileri)

Yeni bileşen:
- `mysticai-mobile/src/components/Astrology/NatalChartHeroCard.tsx`

İçerik:
- zarif kişi künyesi (ad, doğum tarihi/saati, konum)
- Big Three mini özet kartları
- profesyonel natal wheel’in hafif/hero versiyonu (referans amaçlı sürekli görünür)

Ekran entegrasyonu:
- `natal-chart` ready state içinde `ScrollView` üstüne sabit bir hero panel eklendi
- kullanıcı aşağıdaki akordiyonları incelerken haritaya üst panelden referans verebilir

Not:
- Bu sürüm hero paneli sabit tutar; ana detaylar hâlâ aşağıdaki accordion akışında devam eder.

### 10.2 NatalChartProPanels "Hero Mode"

`NatalChartProPanels` genişletildi:
- `mode: 'full' | 'hero'`

`hero` modda:
- yalnızca natal wheel render edilir
- aspect matrix / kozmik denge render edilmez
- wheel içi alt liste ve legend gizlenir (yük ve dikey alan azaltılır)

Amaç:
- header panelde profesyonel SVG natal referansı gösterirken performansı korumak

### 10.3 Accordion Performans İyileştirmesi (Lazy + Reanimated Shared Value)

`AccordionSection` geliştirildi:
- `lazy`
- `deferBodyMount`
- placeholder desteği
- `React.memo` ile izolasyon
- `useSharedValue + useAnimatedStyle + withTiming` ile body opacity/translate animasyonu

Ek olarak:
- ağır bölümlerde (`Doğduğun Gece`, `Profesyonel Natal Harita`, `AI Yorumu`) lazy/deferred mount aktif edildi
- içerik ilk açılışta `InteractionManager` sonrasına ötelenerek frame drop azaltıldı

### 10.4 Dinamik Üçlü Kombinasyon Yorumları (Gezegen + Burç + Ev)

Gezegen detayları (`PlanetBottomSheet`):
- metinler statik açıklamadan çıkarılıp `Gezegen + Burç + Ev` kombinasyonunu açıkça söyleyen yapıya geçirildi
- neden-sonuç anlatımı güçlendirildi

Ev detayları (`HouseBottomSheet`):
- ilgili evdeki gezegenler (`planetsInHouse`) prop olarak alınır hale getirildi
- "Gezegen + Ev + Burç Kombinasyonu" başlıklı yeni kutu eklendi
- evdeki gezegen yerleşimlerine göre dinamik özet oluşturuluyor

### 10.5 AI Prompt Güncellemesi (Kombinasyon Mantığı)

`MysticalPromptTemplates.getNatalChartInterpretationPrompt(...)` içine yeni kural eklendi:
- gezegen yorumları statik kalıplarla değil
- `Gezegen + Burç + Ev` kombinasyonu ile
- neden-sonuç ilişkisi kurularak anlatılsın

Bu kural, mobildeki yeni dinamik yorum kartlarıyla aynı yaklaşımı backend tarafında da teşvik eder.

### 10.6 Drag & Drop Hazırlık Durumu

Bu fazda bağımlılık kurulumu tamamlandı:
- `react-native-draggable-flatlist` (`^4.0.3`)

Durum:
- Paket projeye eklendi
- Tam `DraggableFlatList + AsyncStorage` entegrasyonu bir sonraki patch setinde yapılacak

Sebep:
- Sabit hero + performans + içerik mantığı aynı turda güvenli şekilde stabilize edildi
- DnD refactor’u `ScrollView` → `DraggableFlatList` dönüşümü gerektirdiği için ayrı bir iterasyonda ele alınacak

### 10.7 Drag & Drop (DraggableFlatList) + Sıralama Belleği

`natal-chart` accordion akışı artık sürükle-bırak ile yeniden sıralanabilir:
- `react-native-draggable-flatlist` entegrasyonu yapıldı
- her accordion header’ına sürükleme handle (`reorder-three-outline`) eklendi
- kullanıcı sıralaması `AsyncStorage` içinde saklanıyor (`natal_chart_section_order_v2`)

Teknik notlar:
- görünür/gizli bölümler için `visibleDraggableSectionKeys` türetildi
- gizli bölümler (ör. AI yorumu, chart yokken poster) sıralamayı bozmadan korunuyor
- hydration guard eklendi; ilk render’da default order’ın storage’daki kullanıcı sıralamasını ezmesi engellendi

### 10.8 Profesyonel Natal Görselleri (Fullscreen + PNG/PDF Export)

Yeni route/screen:
- `mysticai-mobile/src/app/natal-visuals-preview.tsx`
- `mysticai-mobile/src/screens/astrology/NatalVisualsPreviewScreen.tsx`

Özellikler:
- `Profesyonel Natal Harita` accordion içinde yeni CTA: **Tam Ekran Gör • İndir**
- `NatalChartProPanels` verisi `zustand` store ile preview ekranına taşınır (`useNatalVisualsStore`)
- preset bazlı export:
  - `Tam Set` (Wheel + Matrix + Denge)
  - `Natal Wheel`
  - `Açı Matrisi` (geniş canvas ile tam grid export)
  - `Kozmik Denge`
- yüksek çözünürlüklü PNG üretimi (`ViewShot + useGenerateMatchImage`)
- sistem paylaşımı, galeriye kaydetme ve PDF export akışları

Not:
- Açı matrisi mobil ekranda yatay kaydırılabilir olmaya devam eder; fullscreen/export ekranında geniş canvas ile tam görünüm alınır.

### 10.9 Backend DTO Genişletme (Gezegen-Burç-Ev Kombinasyonları)

`NatalChartResponse` non-breaking şekilde genişletildi:
- `planetComboInsights[]`
- `houseComboInsights[]`

Yeni backend DTO’lar:
- `astrology-service/.../dto/NatalPlanetComboInsight.java`
- `astrology-service/.../dto/NatalHouseComboInsight.java`

Backend davranışı:
- `AstrologyService.mapToResponse(...)` artık planet/house listelerinden satır bazlı kombinasyon insight’larını üretir
- bu alanlar mobil `PlanetBottomSheet` ve `HouseBottomSheet` tarafından öncelikli metin kaynağı olarak kullanılır
- backend alan yoksa mobil taraf mevcut lokal jeneratif/fallback metinlerini kullanmaya devam eder

### 10.10 Hiyerarşik Kozmik Analiz & Dil Temizliği (Nested AI + %100 Türkçe)

Bu fazda iki ana hedef tamamlandı:
- profesyonel natal teknik veri panelinin 3 ayrı ana akordiyona bölünmesi
- AI yorumunun nested (alt) akordiyonlarla hiyerarşik okunabilir hale getirilmesi

#### 10.10.1 Teknik Veri Panelleri 3 Ayrı Akordiyon

Eski tek parça `Profesyonel Natal Harita` bölümü ayrıldı:
- `Doğum Haritası (Natal Chart)` → yalnızca dairesel harita/SVG
- `Gezegen Etkileşim Tablosu` → açı matrisi (aspect matrix)
- `Kozmik Konum Detayları` → gezegen/burç/derece-dakika/ev konumu teknik listesi

Ek not:
- `Kozmik Denge` paneli ayrı akordiyon olarak korunmuştur (özellik kaybı olmaması için)
- `NatalChartProPanels` içine yeni `positions` panel modu eklendi

#### 10.10.2 AI Analizi İçin Alt Akordiyonlar (Nested Accordions)

`StructuredNatalAiInterpretation` geliştirildi:
- AI yorum paragrafları ve section blokları alt akordiyonlara çevrildi
- ana `AI Yorumu` başlığı ekran tarafında `AI Analizi` olarak güncellendi
- her alt blok için Türkçe dinamik başlık üretimi yapılıyor (`TextProcessor` mantığı)
- JSON parse edilemezse ham metin paragraf bazlı bölünüp yine nested akordiyonlarla gösteriliyor

Yeni yardımcı:
- `mysticai-mobile/src/utils/astroTextProcessor.ts`
  - `inferTurkishAiTitle(...)`
  - `splitPlainAiTextToBlocks(...)`

#### 10.10.3 %100 Türkçe Terim Temizliği (Translation Map Filter)

`astroLabelMap` genişletildi:
- İngilizce astrolojik terimleri UI öncesi Türkçeye çeviren `translateAstroTermsForUi(...)`
- örn. `Sun trine Moon` → `Güneş Üçgen Ay`
- `Ascendant / ASC` → `Yükselen Burç`
- `Midheaven / MC` → `Tepe Noktası (Kariyer)`

Uygulanan yerler:
- `StructuredNatalAiInterpretation` (AI metinleri / başlıklar)
- `AspectBottomSheet` (hook/glossary metinleri)
- `CosmicHotspotCard` (kısa açıklama metni)

#### 10.10.4 Nested Accordion Performansı

`AccordionSection` içinde layout transition güncellendi:
- `LinearTransition.springify()` yerine `Layout.springify()`

Amaç:
- iç içe akordiyonlarda aç/kapa sırasında daha akışkan layout yeniden hesaplama

### 10.11 UX Düzeltmesi: Profil Kartı Üste Alma + Otomatik Açılma Kontrolü

Kullanıcı geri bildirimine göre `natal-chart` ekranında iki UX düzeltmesi yapıldı:

1. `Kozmik Harita Profilleri` kartı en üst sabit alana taşındı
- profil seçimi / compare toggle artık hero kartın üstünde görünür
- kullanıcı farklı profile geçmeden önce ekranın üst kısmında doğrudan erişebilir

2. Akordiyonların otomatik açılma davranışı varsayılan olarak kapatıldı
- `openAccordionKey` başlangıç değeri `null`
- scroll-end auto focus mekanizması varsayılan kapalı (`autoAccordionFocusEnabledRef = false`)
- kullanıcı manuel açtığı akordiyon üzerinde kontrolü kaybetmez

Sonuç:
- alt bölümler görünürlüğü iyileşti
- büyük `Doğum Haritası` panelinin kendiliğinden açılıp ekranı domine etmesi engellendi

### 10.12 Teknik Stabilizasyon & Profesyonel Karşılaştırma (Synastry) Modülü

Bu fazda üç ana problem alanına müdahale edildi:
- `natal-chart` ekranındaki scroll/gesture stabilitesi
- yer seçimi (il/ilçe) duplicate kayıtları
- "çalışmıyor" hissi veren sinastri akışının profesyonel analiz paneline dönüştürülmesi

#### 10.12.1 Scroll Stabilizasyonu (DND Safe Mode + Ana Scroll Koruma)

Gözlenen sorun:
- `react-native-draggable-flatlist` ve nested accordion kombinasyonu bazı cihazlarda ana scroll event'ini tutabiliyor
- özellikle compare kartı + teknik akordiyonlar birlikteyken scroll takılmaları oluşabiliyor

Uygulanan çözüm (stabilite öncelikli):
- `ENABLE_SECTION_DND = false` ile DnD geçici olarak "safe mode"a alındı
- section listesi `DraggableFlatList` yerine statik `View` map render ile çiziliyor
- DnD branch korunuyor (ileride tekrar açılabilir)
- ana `ScrollView` için `keyboardShouldPersistTaps="handled"` kullanımı sürdürülüp nested scroll çakışması azaltıldı
- DnD branch tekrar açılırsa `scrollEnabled={false}` ve `nestedScrollEnabled={false}` ile ana scroll'a öncelik veriliyor

Not:
- Bu yaklaşım "drag-drop özelliği geçici pasif / ekran akışı stabil" dengesini hedefler.

#### 10.12.2 Yer Seçimi (Local Picker) Duplicate Temizliği

Google Places API devre dışı senaryoda kullanılan yerel liste için duplicate kayıtlar temizlendi:
- şehir listesinde normalize edilmiş metin bazlı dedupe
- ilçe listesinde normalize edilmiş metin bazlı dedupe

Eklenen yardımcılar (`natal-chart.tsx`):
- `normalizeTrKey(...)`
- `dedupeByNormalizedText(...)`

Sonuç:
- `"İstanbul"` / varyant tekrarları gibi kullanıcıyı yanıltan satırlar filtreleniyor
- il ve ilçe seçim listeleri daha temiz ve hızlı taranabilir hale geldi

#### 10.12.3 Synastry Backend: Anında Skor + Profesyonel JSON Alanları

`SynastryService.analyze(...)` artık ilk yanıtı daha kullanışlı döndürüyor:
- `harmonyScore` ilk response'ta `null` gelmek yerine rule-based hızlı skor olarak set ediliyor
- AI async tamamlandığında mevcut listener yine bu skoru override edebilir

Yeni backend DTO alanları (`SynastryResponse`):
- `scoreBreakdown`
- `analysisSections`

Yeni DTO kayıtları:
- `SynastryScoreBreakdown`
  - `overall`
  - `love`
  - `communication`
  - `spiritualBond`
  - `methodologyNote`
- `SynastryAnalysisSection`
  - `id`
  - `title`
  - `subtitle`
  - `score`
  - `summary`
  - `tone`
  - `aspects[]`

Rule-based skor yaklaşımı:
- orb yakınlığı (exactness) ağırlığı
- ana gezegen setleri (ör. Venüs/Mars, Merkür/Jüpiter, Ay/Satürn/Plüton/Kuzey Düğümü)
- açı tipine göre artı/eksi katkı (`TRINE`, `SEXTILE`, `CONJUNCTION`, `SQUARE`, `OPPOSITION`)

#### 10.12.4 Synastry Frontend: Profesyonel Karşılaştırma Paneli

`natal-chart` compare alanına yeni `SynastryProPanel` eklendi:
- **Dual Chart (Overlay) görünümü**
  - iç halka: kişi 1 gezegenleri + ev eksen referansı
  - dış halka: kişi 2 gezegenleri
- **Kozmik Uyum Puanları**
  - Genel Uyum
  - Aşk Uyumu (Venüs/Mars)
  - İletişim (Merkür/Jüpiter)
  - Ruhsal Bağ (Ay/Satürn/Plüton/Düğümler)
- **Yıldız Analizleri (Akordiyon)**
  - Kader Bağı (Satürn/Karma)
  - Tutku ve Enerji (Mars/Plüton)
  - Zihinsel Uyum (Merkür)
  - Duygusal Akış (Ay/Venüs)

UI özellikleri:
- AI durumu badge'i (`AI Yazıyor`, `AI Tamamlandı`, `AI Başarısız`)
- backend `analysisSections` varsa doğrudan kullanılır
- backend alan yoksa lokal fallback kategorileme yapılır
- açı listelerinde İngilizce gezegen/adım kalıntıları UI filtresinden Türkçeleştirilir

#### 10.12.5 Görünürlük / Fallback Mantığı (Çalışmıyor Algısını Azaltma)

Compare sonucu render mantığı genişletildi:
- `comparisonResult.harmonyScore`
- veya `comparisonResult.scoreBreakdown?.overall`

Bu sayede:
- AI henüz bitmeden gelen ilk synastry response üzerinde bile sonuç kartı açılabilir
- kullanıcı "butona bastım ama hiçbir şey olmadı" hissini daha az yaşar

#### 10.12.6 Doğrulama

Backend:
- `mvn -pl astrology-service -am -DskipTests compile` → `BUILD SUCCESS`

Mobil:
- global `tsc` projedeki pre-existing hatalar nedeniyle temiz değil
- hedefli log taramasında bu fazda dokunulan dosyalar için yeni hata satırı kalmadı:
  - `natal-chart.tsx`
  - `synastry.service.ts`
  - `SynastryProPanel.tsx`

### 10.13 Hızlı UX Fix: Kozmik Kart Varsayılan Kapalı + Scroll Alanı Rahatlatma

Kullanıcı geri bildirimi:
- "Kozmik harita kısmı açık gelmesin"
- "Kaydırma yapamıyorum"

Uygulanan düzeltme (`natal-chart.tsx`):
- üstteki sabit `NatalChartHeroCard` artık **varsayılan kapalı**
- hero alanı küçük bir `Kozmik Kart` özet satırı olarak gösterilir
- kullanıcı isterse dokunarak hero kartı genişletir
- aktif profil değiştiğinde hero tekrar kapalıya döner (`heroCardExpanded = false`)

Scroll etkisi:
- sabit üst alanın yüksekliği ciddi biçimde azaldığı için ana içerik `ScrollView` için görünür alan artar
- bu, özellikle küçük ekranlarda "scroll kilitli gibi" görünen durumu azaltır

Ek stabilite:
- ana `scrollContent` içinde `flexGrow: 1` korunarak yükseklik hesaplaması daha tutarlı hale getirildi

### 10.14 Hero Kart Düzeni Güncellemesi: Kozmik Kart Açık + Wheel Ayrı Akordiyon

Yeni kullanıcı yönlendirmesine göre üst hero akışı tekrar düzenlendi:

- `Kozmik Kart` üst kartı **varsayılan açık** gelir
- aktif profil değiştiğinde hero yine açık duruma döner
- hero içindeki mini natal wheel önizlemesi çıkarıldı

Amaç:
- kişi özeti (isim, doğum bilgisi, Big Three) üstte görünür kalsın
- dairesel harita görseli teknik bir panel olarak kendi akordiyonunda açılsın

#### 10.14.1 Natal Wheel Adlandırma Temizliği

İngilizce/yarı-teknik ifade temizlendi:
- `Natal wheel referansı` → `Dairesel harita önizlemesi`

Teknik akordiyon başlığı da daha Türkçe/okunaklı hale getirildi:
- `Doğum Haritası` (görsel referans paneli) → `Dairesel Doğum Haritası`
- alt açıklama: `Ev çizgileri ve gezegen yerleşimleri • görsel önizleme`

#### 10.14.2 Drag & Drop Durumu (Kontrol)

Akordiyon sıralaması için DnD altyapısı kodda duruyor ancak şu an bilinçli olarak safe mode'da:
- `ENABLE_SECTION_DND = false`

Neden:
- nested `DraggableFlatList` bazı cihazlarda ana scroll'u kilitleyebiliyor
- scroll stabilitesi öncelikli olduğu için DnD geçici pasif bırakıldı

Not:
- sürükle-bırak render kodu, drag handle ve sıralama persist mantığı kaldırılmadı
- nestable/gesture uyumlu bir kurguya geçince yeniden aktif edilecek

### 10.15 DnD Geri Açıldı: Nestable Draggable FlatList (Scroll Uyumlu)

Kullanıcı talebine göre akordiyon sıralama DnD özelliği tekrar aktifleştirildi.

Yapılan teknik değişiklik:
- `react-native-draggable-flatlist` içindeki nestable bileşenlere geçildi
  - `NestableScrollContainer`
  - `NestableDraggableFlatList`

Amaç:
- ana dikey scroll ile drag gesture çakışmasını azaltmak
- section sürükleme sırasında dış scroll’un güvenli şekilde devre dışı kalıp tekrar açılması

Kod tarafı:
- `ENABLE_SECTION_DND = true`
- ana içerik scroll’u koşullu olarak `NestableScrollContainer` ile render edilir
- section listesi `NestableDraggableFlatList` üzerinden sürüklenir

Not:
- DnD altyapısı tekrar aktif olsa da bazı cihazlarda gesture davranışı değişebilir; gerekirse `activationDistance` / long-press eşiği ayrıca ince ayar yapılır.

### 10.16 UX Geri Dönüş Fixi: Kozmik Kart Kaldırıldı + Scroll Stabilite Önceliği

Kullanıcı geri bildirimine göre arayüz tekrar sadeleştirildi:

1. `Kozmik Kart` toggle/sekme kaldırıldı
- üstteki küçük aç-kapa kartı tamamen kaldırıldı

2. `Kozmik Harita` üst kartı akordiyon olmadan sürekli görünür
- `NatalChartHeroCard` artık doğrudan sabit üst alanda render ediliyor
- kişi özeti + Big Three her zaman görünür
- hero içindeki wheel önizlemesi kapalı kalmaya devam ediyor (`showWheelPreview=false`)

3. Scroll problemi için DnD tekrar safe mode'a alındı
- `ENABLE_SECTION_DND = false`
- amaç: ana scroll hareketinin drag gesture tarafından tekrar yakalanmasını engellemek

Not:
- DnD altyapısı kodda duruyor; scroll stabilitesi kesinleşince tekrar nestable modla açılabilir.

### 10.17 Scroll Davranışı ve Minimal Kozmik Harita Kartı

Kullanıcı deneyimi iyileştirmesi:

1. `Kozmik Harita Profilleri` kartı scroll ile otomatik gizlenir/gösterilir
- sayfa aşağı kaydırıldığında profil kartı gizlenir (okuma alanı uzar)
- kullanıcı en üste yaklaştığında kart tekrar görünür
- eşik/histerezis:
  - gizle: `y > 72`
  - göster: `y < 12`

Amaç:
- üst alanı gereksiz yere sabit tutmadan daha uzun okuma/scroll alanı sağlamak
- profile erişimi tamamen kaybetmeden sadece ihtiyaç anında (üstte) görünür tutmak

2. `Kozmik Harita` üst kartı daha minimal hale getirildi
- ayrı tarih/saat/konum pill blokları kaldırıldı
- daha kompakt bir başlık + tarih/saat satırı + konum satırı yapısına geçildi
- `Big Three` alanı büyük kartlar yerine daha küçük/kompakt satır chip'lerine dönüştürüldü
- hero içinde wheel kapalıyken kullanıcıya kısa yönlendirme metni eklendi:
  - `Dairesel Doğum Haritası` akordiyonuna yönlendirir

Sonuç:
- üst kart yüksekliği azaldı
- scroll alanı rahatladı
- kullanıcı ilk bakışta temel bilgileri daha hızlı tarayabiliyor

### 10.18 Tasarım Refactor (Frontend Designer Pass): Astro Atlas Düzeni

Kullanıcı geri bildirimi sonrası `Kozmik Harita` üst alanı ve sayfanın üst hiyerarşisi yeniden tasarlandı.

#### 10.18.1 Tasarım Yönü

Yeni görsel yaklaşım:
- **Astro Atlas / Dossier** dili
- koyu başlık plakası + açık içerik gövdesi
- veriyi "tek bakışta okunur" bloklara ayıran editoryal kart sistemi

Amaç:
- sadece minimal değil, karakterli ve profesyonel bir görünüm
- bilgi yoğunluğunu korurken göz yorgunluğunu azaltmak

#### 10.18.2 Kozmik Harita Hero Kartı Baştan Tasarlandı

`NatalChartHeroCard` yeniden yazıldı:
- koyu üst başlık plakası (`KOZMİK HARİTA DOSYASI`)
- isim / temel kimlik satırı
- `Yer` + `Sistem (Tropikal • Placidus)` meta chip'leri
- `Kozmik İmza` paneli (Güneş / Ay / Yükselen için daha şık satır kartları)
- hızlı metrikler:
  - `Gezegen`
  - `Ev`
  - `Açı`
- teknik akordiyonlara yönlendiren daha profesyonel alt not

Not:
- hero içi natal wheel önizlemesi hâlâ kapalı (`showWheelPreview=false`) ve teknik akordiyona bırakılmıştır.

#### 10.18.3 Sayfa Üst Yapısı Yeniden Stilize Edildi

`natal-chart` üst kabuğunda görsel hiyerarşi iyileştirildi:
- `fixedTopStack` spacing ve separator çizgisi güncellendi
- `scrollContent` spacing daha okunabilir ritme çekildi
- `Kozmik Harita Profilleri` kartı daha editoryal/premium kart görünümüne geçirildi
- profil kartına meta tag satırı eklendi:
  - toplam profil sayısı
  - mod durumu (`Okuma modu` / `Karşılaştırma modu • x/2 seçili`)

#### 10.18.4 Karşılaştırma Alanı Görsel Dili Güncellendi

Karşılaştırma bloğu (`compareCard`) üst bölüm stil güncellemesi:
- kart kenar/zemin dengesi iyileştirildi
- başlık Türkçeleştirilmiş ve sadeleştirilmiş:
  - `Sinastri / Synastry` → `Sinastri Atölyesi`
- çağrı butonu daha güçlü kontrastlı koyu tonlu CTA haline getirildi

Sonuç:
- sayfanın üst kısmı artık tek tek eklenmiş kartlar gibi değil, aynı tasarım ailesine ait bir ürün ekranı gibi görünür
- kozmik harita bölümü daha profesyonel ve "tasarlanmış" bir kimlik kazandı

### 10.19 Scroll Kurtarma (Sticky Kozmik Harita + Doğal Kaybolan Profil Kartı)

Kritik hata düzeltmesi:
- kullanıcı `scroll` hareketinin çalışmadığını bildirdi

Kök neden:
- üstteki büyük sabit alan (`fixedTopStack`) scroll dışında kaldığı için kullanıcı hero/profil kartı üzerinden kaydırma başlatınca sayfa tepkisiz hissediliyordu

Yapısal çözüm:
- `Kozmik Harita Profilleri` kartı artık **scroll içinde** yer alır (en üstte)
- kullanıcı aşağı kaydırdığında kart doğal olarak yukarı kayıp görünümden çıkar
- en üste dönünce doğal olarak tekrar görünür
- `Kozmik Harita` hero kartı scroll içine alındı ve `stickyHeader` olarak sabitlendi

Teknik uygulama:
- `MainVerticalScroll` içine:
  1. profil kartı
  2. sticky `NatalChartHeroCard`
  3. compare + akordiyon içerikleri
- `stickyHeaderIndices={chart ? [1] : []}`
- eski scroll-state ile profil kartı gizleme (`showProfileSwitcherOnTop`) mantığı kaldırıldı

Sonuç:
- kaydırma hareketi hero kartın üzerinden de başlatılabilir
- `Kozmik Harita` kartı görünür kalma hedefi korunur (sticky)
- profil kartı ekstra state yönetimi olmadan kaybolup geri gelir

### 10.20 Yıldız Harita Bilgileri (Açılır/Kapanır Hero + Etkileşim Köprüleri)

Kullanıcı geri bildirimine göre üst hero kartı yeniden güncellendi:

#### 10.20.1 İsim Değişikliği ve Varsayılan Durum

- `KOZMİK HARİTA DOSYASI` → `YILDIZ HARİTA BİLGİLERİ`
- kart artık açılır/kapanır yapıdadır
- varsayılan durum **kapalı** (özet başlık görünür, detay gövde gizli)
- profil değiştiğinde tekrar kapalıya döner

#### 10.20.2 Renk Dili (Uygulama Paletine Uyum)

Koyu/siyah başlık plakasının yerine uygulamanın tema renkleri kullanıldı:
- `primaryTint`
- `violetBg`
- `card / surfaceAlt`
- tema metin/border renkleri

Amaç:
- mevcut ürün renk sistemine daha iyi uyum
- üst bölümde sert siyah blok etkisini kaldırmak

#### 10.20.3 Teknik Terim Çevirisi

`System - Tropical Placidus` ifadesi kullanıcı dostu Türkçeye çevrildi:
- `Harita Sistemi`
- `Tropikal Zodyak • Placidus Ev Sistemi`

#### 10.20.4 Big Three Etkileşimi (Hero İçinden Detaya Git)

`Kozmik İmza` bölümündeki:
- Güneş
- Ay
- Yükselen

satırlarına dokunulduğunda mevcut Big Three detay bottom sheet'i açılır.

#### 10.20.5 Metrik Kısayolları (Gezegen / Ev / Açı)

Hero karttaki metrik chip'leri etkileşimli hale getirildi:
- `12 Gezegen` → `Gezegen Konumları` akordiyonuna gider ve açar
- `12 Ev` → `Ev Konumları` akordiyonuna gider ve açar
- `22 Açı` → `Gezegensel Açılar` akordiyonuna gider ve açar

Teknik not:
- hedef akordiyon önce açılır
- ardından kayıtlı layout bilgisi üzerinden `scrollTo` ile ilgili bölüme kaydırılır
- sticky hero yüksekliği hesaba katılarak üstte görünür pozisyon ayarlanır

### 10.21 Karşılaştırma / Sinastri Atölyesi Profesyonel Revizyonu

Bu fazda karşılaştırma modülü hem teknik stabilizasyon hem de anlatım kalitesi açısından yeniden ele alındı.

#### 10.21.1 `Eksenler yüklenemedi` Hatası İçin Güvenli Fallback

`MatchTraitsService` içinde trait ekseni üretim hattı (scoring + notes + card axes) herhangi bir sebeple hata verirse endpoint artık `500` düşürmek yerine fallback payload döndürür.

Kazanımlar:
- Karşılaştırma ekranı tamamen kırılmaz
- Kullanıcı kart üretmeye devam edebilir
- Log üzerinden hata takibi korunur

#### 10.21.2 Sinastri Panelinde Ham Açı Listesi Yerine Anlamlandırılmış İçgörü Kartları

`Öne Çıkan Çapraz Açılar` alanı yeniden tasarlandı:
- yeni başlık: `Çapraz Etkileşimlerin İlişkiye Yansıması`
- her açı için:
  - iki taraflı gezegen eşleşmesi
  - tema etiketi (çekim / zihinsel akış / duygusal güven vb.)
  - ilişkiye etkisi (samimi ve yorumlayıcı dil)
  - yönetim notu (uygulamalı öneri)

Amaç:
- `Güneş Üçgen Ay` gibi ifadeyi sadece teknik veri olmaktan çıkarıp "ikiniz arasında ne üretiyor?" sorusuna cevap vermek

#### 10.21.3 `Yıldız Analizleri` Bölümünü İki Tarafı Karşılaştıran Yapıya Taşıma

Her analiz akordiyonunun içinde yeni `İki Taraf Nasıl Çalışıyor?` paneli eklendi:
- `Kişi A` tarafında baskın gezegen temaları
- `Kişi B` tarafında baskın gezegen temaları
- ortak dinamik / denge notu

Bu sayede kullanıcı yalnızca "ilişkide ne var" değil, "kim hangi taraftan bu dinamiği taşıyor" bilgisini de okur.

#### 10.21.4 Anlamsız Metodoloji Notu Kaldırıldı

Backend `SynastryScoreBreakdown.methodologyNote` alanındaki:
- `AI yorumu geldikçe anlatım derinleşir`

ifadesi kaldırıldı (`null` döndürülüyor) ve mobilde ilgili render da gösterilmez hale getirildi.

#### 10.21.5 Match Sonuç Ekranında Sade Mod (Graceful Degradation)

Trait endpoint geçici hata verirse:
- kırmızı hata kartı yerine uyarı + `sade mod` gösterilir
- yerel (fallback) kategori eksenleri render edilir
- kullanıcı `Detay eksenleri tekrar dene` ile yeniden deneyebilir

Bu yaklaşım, kullanıcı deneyimini hata ekranına kilitlemek yerine akışı sürdürür.

#### 10.21.6 `Yıldız Kartımızı Oluştur` Kart Tasarımı (Instagram-Ready)

Paylaşım kartı (`MatchCard`) baştan tasarlandı:
- premium / editoryal kompozisyon
- krem-altın-mavi rafine palet
- daha güçlü tipografik hiyerarşi
- daha temiz kişi karşılaştırma düzeni
- merkezde `Kozmik Uyum` madalyonu
- özet + karşılaştırmalı eksenler dengeli yerleşim

Amaç:
- Instagram feed paylaşımında daha "premium ürün" hissi
- daha az dağınık, daha yüksek okunabilirlik

### 10.22 Karşılaştırma Modülü Stabilizasyonu (Revizyon 2)

Kullanıcı geri bildirimi sonrası sinastri ekranı ikinci kez iyileştirildi:

#### 10.22.1 Detay Eksenler İçin Controller-Seviyesi Güvenli Fallback

`MatchTraitsController` artık trait endpoint zincirinde oluşabilecek hatalarda doğrudan `200` + fallback `MatchTraitsResponse` döndürür.

Amaç:
- `Eksenler yüklenemedi` gibi kırmızı hata deneyimini azaltmak
- ana sinastri analizi akışını durdurmamak

#### 10.22.2 Frontend’de Broken Detay Eksen Bölümünü Zorla Göstermeme

Trait endpoint hata verirse:
- detay eksen kartları render edilmez
- bunun yerine kısa bir bilgilendirme kartı görünür
- kullanıcı isterse `Tekrar dene` ile endpoint'i yeniden çağırabilir

Not:
- Yıldız kartı üretimi için minimal eksen fallback verisi arka planda korunur

#### 10.22.3 `Çapraz Etkileşimlerin İlişkiye Yansıması` Alt Akordiyon Yapısı

Bu bölümdeki her etkileşim kartı alt-akordiyona çevrildi:
- başlıkta açı özeti
- kısa meta (iki taraf + tema)
- açıldığında:
  - ilişki dinamiği açıklaması
  - karşılaştırmalı yorum
  - ilişki yönetimi notu

Amaç:
- ekranın bir anda fazla uzamasını önlemek
- kullanıcının tek tek odaklanarak okumasını sağlamak

#### 10.22.4 `Yıldız Kartı` Tasarımı (Revizyon 2)

Önceki paylaşım kartı tasarımı kullanıcı tarafından zayıf bulunduğu için yeniden tasarlandı:
- yeni tema: `obsidian / petrol / bakır`
- yeni tipografi: `Cochin + AvenirNext` (platform fallback’li)
- daha sade ama premium görsel hiyerarşi
- performans için kart içi mini eksen render (hafif custom row), ağır component bağımlılığı azaltıldı

### 10.23 Yıldız Kartı (Referans Tasarıma Uyumlu Neon Sinastri Kartı)

Kullanıcının paylaştığı referans görseller doğrultusunda `Yıldız Kartı` üçüncü kez yeniden tasarlandı.

#### 10.23.1 İlişki Türüne Göre Dinamik Kart Başlığı

Kart üst başlığı artık seçilen karşılaştırma tipine göre otomatik değişir:
- `LOVE` → `EŞ UYUMU • SYNASTRY KARTI`
- `FRIENDSHIP` → `ARKADAŞLIK UYUMU • SYNASTRY KARTI`
- `BUSINESS` → `İŞ ORTAKLIĞI UYUMU • SYNASTRY KARTI`
- `FAMILY` → `AİLE UYUMU • SYNASTRY KARTI`
- `RIVAL` → `REKABET DİNAMİĞİ • SYNASTRY KARTI`

#### 10.23.2 Kart İçeriği Artık Karşılaştırma Sonucundan Beslenir

Yıldız kartı draft’ına şu veriler taşındı:
- `relationshipType`
- `scoreBreakdown` (`overall`, `love`, `communication`, `spiritualBond`)

Bu sayede kart içindeki metrikler ve panel başlıkları karşılaştırma türüne göre anlamlı hale gelir.

#### 10.23.3 Referans Görsele Yakın Neon Galaksi Stil

Yeni tasarım özellikleri:
- pembe/mor neon galaksi arka plan
- parlak kalp merkez kompozisyonu
- büyük script isim satırı
- neon skor bandı (`GENEL UYUM`)
- 2x2 insight panel düzeni

#### 10.23.4 Performans Notu

Paylaşım kartı üretiminde daha stabil capture için:
- kart içi mini eksenler custom hafif component ile çizildi
- ağır bar component yerine kısa/neon track yapısı kullanıldı
- hesaplanan panel/metrik içerikleri `useMemo` ile üretildi

### 10.24 Yıldız Kartı Tekrar Açılış Bug Fix

Sorun:
- `Yıldız Kartı Önizleme` ekranından geri dönüldüğünde kart draft verisi unmount sırasında store'dan temizleniyordu.
- Aynı karşılaştırma sonucu için `MatchResultScreen` tekrar render olmadığı için draft yeniden yazılmıyordu.
- Sonuç: ikinci kez tıklamada kart oluşmuyordu.

Çözüm:
- `MatchCardPreviewScreen` unmount cleanup içindeki `clearDraft()` kaldırıldı.
- Draft verisi kullanıcı geri dönse bile korunur; aynı kart tekrar açıldığında yeniden capture/generate çalışır.

### 10.25 Yıldız Kartı Boyut / Ton / iOS Fotoğraf İzni Fix

#### 10.25.1 Kart Kesilme Hissi İçin Boyut Artırımı

Yıldız kartı dikey kompozisyonu uzatıldı:
- kart render boyutu: `360x450` → `360x540`
- capture export boyutu: `1080x1350` → `1080x1620`
- preview aspect ratio: `4:5` → `2:3`

Amaç:
- panel içeriklerinin daha rahat yerleşmesi
- kartın alt bölümünün sıkışık/kesik görünmemesi

#### 10.25.2 Üstteki Özet Metin Satırı Kaldırıldı

İsim satırının altında görünen kısa özet cümlesi (örn. "Bu iki haritanın uyumu...") kart üst alanından kaldırıldı.

Neden:
- kullanıcı geri bildirimine göre görsel hiyerarşiyi bozuyordu
- referans tasarımdaki temiz üst alan estetiğini engelliyordu

#### 10.25.3 Daha Light Neon Ton

Kart arka plan ve panel renkleri daha açık/pastel-neon tona çekildi:
- ana gradient daha parlak mor/pembe
- panel yüzeyleri ve border'lar daha aydınlık
- preview background tonu açıldı

#### 10.25.4 iOS Galeriye Kaydetme Crash Fix (`Info.plist`)

`expo-media-library` kullanımı için iOS izin açıklama metinleri `app.json` içine eklendi:
- `NSPhotoLibraryUsageDescription`
- `NSPhotoLibraryAddUsageDescription`

Not:
- Bu değişiklikten sonra iOS build’in yeniden alınması gerekir (hot reload yetmez).

### 10.26 Resmi İlişki Metrikleri (Backend Source of Truth)

Frontend’de türetilen (heuristic) kart metrikleri yerine backend kaynaklı resmi ilişki metrikleri eklendi.

#### 10.26.1 Backend: `displayMetrics` Alanı

`SynastryResponse` içine yeni alan eklendi:
- `displayMetrics[]` (`id`, `label`, `score`)

Bu metrikler ilişki tipine göre backend `SynastryService` tarafından rule-based hesaplanır.

#### 10.26.2 İlişki Tipine Göre Resmi Metrik Setleri

Örnekler:
- `LOVE`: Aşk / İletişim / Güven / Tutku
- `FRIENDSHIP`: Eğlence / İletişim / Güven / Destek
- `BUSINESS`: İş Birliği / İletişim / Strateji / Güven
- `FAMILY`: Şefkat / İletişim / Güven / Dayanışma
- `RIVAL`: Rekabet / Strateji / Odak / Gerilim

#### 10.26.3 Frontend Kullanımı (Kart + Sinastri Panel + Sonuç Ekranı)

Resmi metrikler artık sadece paylaşım kartında değil, şu alanlarda da gösterilir:
- `MatchResultScreen` (özetin altında)
- `SynastryProPanel` (skor grid altında)
- `Yıldız Kartı` (`displayMetrics` varsa frontend fallback yerine bunları kullanır)

#### 10.26.4 Fallback Stratejisi

Backend `displayMetrics` yoksa:
- mevcut frontend fallback (heuristic) metrik hesapları devreye girer
- kullanıcı arayüzü boş kalmaz

### 10.27 Yıldız Kartı Tasarım Yenileme (Pastel / Lila Referans Stil)

Kullanıcının paylaştığı açık tonlu referans görsele göre `Yıldız Kartı` (synastry share card) görsel dili yeniden düzenlendi.

#### 10.27.1 Tasarım Yönü

- Neon/pembe ağırlıklı koyu görünüm yerine açık pastel lila tema
- Yumuşak galaksi dokusu + parlak yıldız/sparkle detayları
- Cam panel (glass-card) hissi veren yarı saydam bilgi kutuları
- Daha zarif başlık hiyerarşisi ve okunabilir kontrast

#### 10.27.2 Korunan Dinamikler

Sadece görsel katman değiştirildi; aşağıdaki dinamik davranışlar korunur:
- ilişki tipine göre başlık (`Eş Uyumu`, `Arkadaşlık Uyumu` vb.)
- backend kaynaklı resmi `displayMetrics`
- karşılaştırma sonucuna göre panel içerikleri (`buildPanels`)
- kişi adları / burçlar / açı sayısı / skorlar

#### 10.27.3 Teknik Not

`MatchCard.tsx` içinde:
- arka plan SVG kompozisyonu (sparkle/hearts/clouds) yeniden çizildi
- skor bandı gradient kapsül formuna getirildi
- metrik ve içgörü panelleri pastel temaya uygun yeniden stillendi
- footer etiket metninde `LOVE` için hashtag `#aşk` kullanımı güncellendi

### 10.28 Yıldız Kartı Kesilme / Yerleşim Revizyonu

Kullanıcı geri bildirimi doğrultusunda kartın üst kompozisyonu sadeleştirildi ve kesilme hissini azaltmak için kart yüksekliği artırıldı.

#### 10.28.1 Değişiklikler

- Kart yüksekliği `540 -> 620` artırıldı
- Kart önizleme/capture oranı yeni yüksekliğe göre güncellendi
- Üstteki özet cümle (`"Bu iki haritanın uyumu..."` tipi satır) kaldırıldı
- Merkezdeki büyük kalp görseli kaldırıldı
- İsim bloğu ile skor kapsülü arasına daha temiz dekoratif boşluk bırakıldı (referans görsele daha yakın kompozisyon)

#### 10.28.2 Capture/Preview Güncellemesi

- hidden render canvas: `360x620`
- export output: `1080x1860`
- preview aspect ratio: `360/620`

### 10.29 Yıldız Kartı Tipografi ve Boşluk İnce Ayarı

Kullanıcı geri bildirimine göre:
- İsimler ile `Genel Uyum` kapsülü arasındaki boşluk azaltıldı
- Kartın alt bölümündeki küçük metinler (metrik satırı, panel içerikleri, footer yazıları) büyütüldü

Amaç: mobil önizlemede daha az “boşluk kaybı” ve daha okunur paylaşım kartı.

### 10.30 Yıldız Kartı Alt Taşma (Bottom Clipping) Düzeltmesi

- Kart yüksekliği tekrar artırıldı: `620 -> 660`
- Alt alana kontrollü boşluk bırakmak için footer sonrası ekstra spacer eklendi
- Capture/export/preview oranları yeni yüksekliğe göre güncellendi (`1080x1980`, `360x660`)

Amaç: alt footer/metinlerin kesilmeden görünmesi ve altta küçük bir nefes alanı bırakılması.

### 10.31 Yıldız Kartı Panel İçi Düzen (Başlığa Özel Layout)

Kullanıcı talebine göre paylaşım kartındaki 4 bilgi paneli, özellikle `LOVE` (eş/aşk uyumu) kartında başlığa özel görsel düzen ile render edilir hale getirildi.

#### 10.31.1 LOVE Kartı Özel Panel Düzeni

- `Sevgi Dili`: iki kişi için ayrı satır (`Ad: ifade biçimi`) + vurgu balonu
- `Duygusal Bağ`: `Güçlü yanlarınız` satırı + `Altın kural` balonu + dipnot
- `Çekim & Tutku`: kısa açıklama + `Dikkat` balonu + dipnot
- `Güven & Bağlılık`: güven cümlesi + `İstikrarı besleyen anahtar` balonu + dipnot

#### 10.31.2 Dinamik Veri Kaynağı

Bu özel layout statik metin değildir; içerik şu kaynaklardan türetilir:
- `traitAxes` (dominant/balancing etiketleri ve notları)
- `overallScore`
- `cardSummary / aiSummary`

Diğer ilişki tiplerinde mevcut generic panel render fallback’i korunur.

### 10.32 Yıldız Kartı Önizleme Alt Detay Tasarımı (Kısa Özet Bilgiler)

`Yıldız Kartı Önizleme` ekranında kartın altında kısa özet bilgiler için tasarlanmış bir bilgi bloğu eklendi.

#### 10.32.1 İçerik

- `Kart Türü` / `Genel Uyum` / `Açı Sayısı` hızlı özet pill’leri
- Backend kaynaklı resmi `displayMetrics` skor rozetleri (varsa)
- `Öne Çıkan Tema` ve `Dikkat Notu` mini kartları

#### 10.32.2 Veri Kaynağı

Özet bilgiler şu kaynaklardan türetilir:
- `draft.displayMetrics`
- `draft.traitAxes`
- `draft.cardSummary` / `draft.aiSummary`

Amaç: kullanıcı kartı paylaşmadan önce, kartın ne anlattığını kısa ve okunur şekilde görsün.

### 10.33 Yıldız Kartı: Tüm İlişki Tipleri İçin Özel Panel Düzeni

`LOVE` kartında uygulanan başlığa özel panel düzeni, diğer ilişki tiplerine de genişletildi.

#### 10.33.1 Özel Düzen Eklenen Kart Tipleri

- `FRIENDSHIP`: `Ortak İlgi`, `Eğlence Tarzı`, `Güven & Sırlar`, `Destek & Şefkat`
- `BUSINESS`: `Ortak Hedef`, `Karar & İletişim`, `Rol Dağılımı`, `Güven & Sorumluluk`
- `FAMILY`: `Şefkat Dili`, `Ev İçi Ritim`, `Duygu & İletişim`, `Dayanışma`
- `RIVAL`: `Rekabet Dili`, `Zihinsel Oyun`, `Gerilim Noktası`, `Kazanma Stratejisi`

#### 10.33.2 Tasarım Mantığı

Her kart tipi için paneller artık:
- kişi bazlı satır düzeni (`duo`) gereken yerlerde
- `lead + callout + footnote` yapısı gereken yerlerde
- ilişki tipine uygun dil (arkadaşlık/iş/aile/rekabet) ile

render edilir. İçerik statik değildir; `traitAxes`, `summary` ve skorlar üzerinden üretilir.

### 10.34 Yıldız Kartı Önizleme Temizliği ve Arkadaşlık Kartı Metin Kısaltma

Kullanıcı geri bildirimi sonrası iki düzeltme yapıldı:

#### 10.34.1 Önizleme Alt Detay Bloğu Kaldırıldı

`Yıldız Kartı Önizleme` ekranına eklenen `Kısa Özet Bilgiler` bloğu kaldırıldı.

Gerekçe:
- kullanıcı beklentisi kartın kendisine odaklanmak
- ekstra bilgi bloğunun yanlış anlaşılması (kart içi panel metinleriyle karışması)

#### 10.34.2 FRIENDSHIP Panel Metinleri Kısaltıldı

`Arkadaşlık Uyumu` kartındaki şu panellerde metinler paylaşım kartına daha uygun olacak şekilde kısaltıldı:
- `Ortak İlgi`
- `Eğlence Tarzı`
- `Güven & Sırlar`
- `Destek & Şefkat`

Özellikle:
- vurgu cümleleri
- `callout`
- `footnote`

daha kısa, daha okunur mikro-kopyaya çevrildi.

### 10.35 Tüm İlişki Tiplerinde Mikro-Kopya Sıkılaştırma + Alt Boşluk Düzeltmesi

Kullanıcı geri bildirimi sonrası iki iyileştirme birlikte yapıldı:

#### 10.35.1 Tüm İlişki Tiplerinde Panel Metinleri Kısaltıldı

Sadece `FRIENDSHIP` değil, tüm kart tiplerinde panel metinleri paylaşım kartına uygun olacak şekilde sıkılaştırıldı:
- `LOVE`
- `FRIENDSHIP`
- `BUSINESS`
- `FAMILY`
- `RIVAL`
- generic fallback panel render

Özellikle:
- lead / callout / footnote metinleri
- panel içi clip limitleri
- generic fallback açıklama cümleleri

daha kısa ve daha okunur hale getirildi.

#### 10.35.2 Kart Alt Taşma Tekrar Düzeltildi (Boşluk Bırakılarak)

- kart yüksekliği artırıldı: `660 -> 720`
- alt footer spacer büyütüldü (bilinçli nefes alanı için)
- preview/capture/export oranları güncellendi:
  - `360x720`
  - `1080x2160`

Amaç: alt metinlerin kesilmemesi ve footer altında küçük bir boşluk kalması.

### 10.36 Sinastri Stabilizasyonu + Hero Scroll Davranışı + Kişi Ekleme (Cinsiyet)

Bu fazda kullanıcı geri bildirimine göre sinastri detay eksenleri, çapraz etkileşim akordiyon başlık taşması, `Yıldız Harita Bilgileri` scroll davranışı ve kişi ekleme formu birlikte iyileştirildi.

#### 10.36.1 `Detay Eksenler` Geçici Uyarısı Kaldırıldı (Kalıcı Degrade)

- `MatchResultScreen` içindeki `Detay eksenler geçici olarak kapatıldı` uyarı kartı kaldırıldı.
- Trait endpoint hata verse bile frontend artık kategori kartlarını rule-based fallback ile göstermeye devam ediyor.
- Sadece veri hiç yoksa nötr durum kartı gösteriliyor; hata varsa küçük `Tekrar dene` butonu kalıyor.

#### 10.36.2 Kök Sebep Analizi ve Backend Çözümü

Asıl kırılma noktası:
- `MatchTraitsService` içinde kategori skorlama + LLM not üretimi aynı `try/catch` içindeydi.
- `LlmNotesService` hata verdiğinde tüm trait response boş dönüyor, UI hata akışına düşüyordu.

Kalıcı çözüm:
- kategori skorlama rule-based olarak her durumda çalışır
- LLM not üretimi ayrı `try/catch` içine alındı
- LLM patlarsa kategoriler ve kart eksenleri notsuz ama dolu şekilde dönmeye devam eder

#### 10.36.3 `Çapraz Etkileşimlerin İlişkiye Yansıması` Başlık Taşma Fix

Ekran görüntüsündeki dikey harf-harf yazılma sorunu için:
- `AccordionSection` başlık/subtitle alanına `minWidth: 0` ve `numberOfLines` sınırları eklendi
- header sağ badge alanı daraltıldı / shrink davranışı düzeltildi
- sonuç: başlıklar dar cihazlarda dikey kolon gibi kırılmıyor

#### 10.36.4 `Yıldız Harita Bilgileri` + Profil Kartı Scroll Davranışı

- `12 gezegen / 12 ev / 22 açı` metriklerine tıklanınca:
  - `Kozmik Harita Profilleri` gizlenir
  - `Yıldız Harita Bilgileri` otomatik kapanır
  - ilgili akordiyon (`Gezegen Konumları / Ev Konumları / Gezegen Açılar`) açılır
  - scroll otomatik olarak hedef bölüme gider
- `Yıldız Harita Bilgileri` açıkken kullanıcı aşağı kaydırırsa kart otomatik kapanır
- `Kozmik Harita Profilleri` scroll ile yukarıdan kaybolur, en üste dönünce tekrar görünür

#### 10.36.5 Kişi Ekleme Formu (Local Picker Odaklı UX + Cinsiyet)

- kişi ekleme akışında konum seçimi yerel liste odaklı moda alındı (Google Places öneri akışı devre dışı)
- il/ilçe seçiminde liste tabanlı seçim ve arama akışı korundu
- forma `Cinsiyet (Opsiyonel)` alanı eklendi

Yeni cinsiyet alanı:
- kayıtlı kişi verisine kaydedilir (`saved_persons.gender`)
- karşılaştırma isteğine taşınır (`SynastryRequest.userGender`)
- AI ilişki analizi prompt’unda `Kişi A / Kişi B cinsiyet` bağlamı olarak kullanılır (hitap tonu amaçlı)

#### 10.36.6 Backend/Mobile Sözleşme Güncellemeleri

- `SavedPersonRequest.gender`
- `SavedPersonResponse.gender`
- `SavedPersonResponse.relationshipType` (frontend uyumluluğu için alias)
- `SynastryRequest.userGender`
- DB migration: `V5__Add_Gender_To_Saved_Persons.sql`

#### 10.36.7 Scroll Top'ta Profil/Kişi Ekle Kartının Geri Görünmeme Fix'i

Kullanıcı geri bildirimi sonrası:
- `Kozmik Harita Profilleri` kartı artık koşullu render ile DOM’dan kaldırılmıyor
- üstte sabit bir slot içinde tutulup yükseklik/opacity ile gizleniyor

Amaç:
- sticky header index kaymasını önlemek
- scroll en üste gelindiğinde `Kişi Ekle` alanının garanti şekilde tekrar görünmesi

#### 10.36.8 Sinastri Akordiyon Header Redesign (Mobil Taşma Fix)

Sinastri modülünde dar ekranlarda görülen:
- başlığın harf harf alt alta kırılması
- badge’lerin başlıkla üst üste binmesi

sorunları için akordiyon header yapısı yeniden tasarlandı.

Değişiklikler:
- `AccordionSection` bileşenine `headerMeta` alanı eklendi
- durum badge’leri sağ sütundan alınarak başlık/subtitle altındaki ayrı satıra taşındı
- `Çapraz Etkileşimlerin İlişkiye Yansıması` kartlarında orb etiketi kısa forma geçirildi (`Çok güçlü` vb.)
- `Karşılaştırmalı Yıldız Analizleri` alt başlıklarında tone/score badge’leri wrap destekli hale getirildi

Sonuç:
- mobil ekranda başlık okunurluğu arttı
- badge taşmaları/üst üste binme problemi giderildi

#### 10.36.9 Hero Metriklerinden Akordiyonlara Zorunlu Scroll Fix'i

`12 Gezegen / 12 Ev / 22 Açı` metriklerine tıklanınca:
- ilgili akordiyonun açık kalması
- layout animasyonu sırasında doğru scroll konumuna inmesi

için `jumpToAccordionSection` güçlendirildi.

Teknik yaklaşım:
- hedef akordiyon `openAccordionKey` ile zorunlu açılır
- tek sefer yerine çoklu zamanlanmış scroll denemesi yapılır (`40 / 140 / 280 / 460 / 700ms`)
- hedef layout geç oluşsa bile sonraki denemelerde doğru konuma iner
- son aşamada `measureLayout` ile hedef akordiyon wrapper'ı scroll container'a göre doğrudan ölçülür (daha kesin odak)

Ek iyileştirme:
- scroll hedefi sadece üst hizalama değil, görünür alanın orta bandına gelecek şekilde hesaplanır
- böylece açılan akordiyon gövdesi ekranın altında kalma sorunu azalır

Sonraki ince ayar:
- kullanıcı geri bildirimi üzerine hedefleme `orta` yerine `üst-orta` banda çekildi
- metrik tıklaması sonrası akordiyon header’ı daha yukarıda konumlanır, içerik daha görünür kalır

Ek scroll odak düzeltmesi:
- akordiyon hedef koordinatı sadece iç kart `onLayout` verisine bırakılmadı
- wrapper seviyesinde (liste içi gerçek sıra konumu) layout ölçümü eklenerek scroll hedefi düzeltildi
- amaç: `12 Gezegen / 12 Ev / 22 Açı` tıklamalarında yanlış bölgeye odaklanma sorununu azaltmak

#### 10.36.10 Kişi Ekleme > Doğum Lokasyonu Alanı Sadeleştirme (Frontend Redesign)

Kullanıcı geri bildirimi doğrultusunda `Doğum Lokasyonu` alanı yeniden tasarlandı:

- üstteki tekrar eden klasik form satırları (`İl / Şehir`, `İlçe`) kaldırıldı
- daha sade bir `Konum Seçimi` kartı eklendi
- kart içinde:
  - `Ülke` seçim kartı
  - yan yana `İl / Şehir` ve `İlçe` seçim kartları
  - `Seçilen Doğum Lokasyonu` özet kutusu

Amaç:
- aynı bilgiyi iki kez gösteren satırları kaldırmak
- seçim akışını mobile-first, daha okunur ve daha az kalabalık hale getirmek
- inline liste picker ile uyumlu tek bir seçim deneyimi sağlamak

Ek UX iyileştirmesi:
- `İl / Şehir` (ve local picker açılan diğer adımlar) tıklandığında modal içi scroll otomatik olarak inline liste paneline iner
- kullanıcı listeyi görmek için aşağı kaydırmak zorunda kalmaz

#### 10.36.11 Kişi Ekleme > Konum Picker Scroll ve Metin Sadeleştirme

Yeni kullanıcı geri bildirimi doğrultusunda `Kişi Ekle` modalındaki konum seçim akışı sadeleştirildi ve auto-scroll davranışı güçlendirildi:

- `İl / Şehir` tıklamasında inline liste paneline scroll hedefi artırıldı
- sabit `+28px` yerine modal viewport yüksekliğine göre dinamik offset kullanılıyor
- hedef artık daha aşağıya (ekran orta bandına yakın) kayar, liste bölümü daha görünür açılır

Metin sadeleştirmesi:
- `Doğum Lokasyonu` alan etiketi kaldırıldı
- `Liste Tabanlı Konum Seçimi` bilgi kartı kaldırıldı
- konum alanı yalnızca `Konum Seçimi` kartı üzerinden ilerleyen daha temiz bir hiyerarşiyle bırakıldı

#### 10.36.12 AI Yorum Dil Temizliği ve Paragraf Ayrıştırma Düzeltmesi

Kullanıcı geri bildirimi üzerine `AI Yorumu` bölümünde görülen İngilizce kalıntılar ve hatalı paragraf ayrımı düzeltildi:

- UI öncesi astroloji terimi çevirisine ek olarak anlatım düzeyi İngilizce bağlaç/zarf temizliği eklendi
  - örn. `sometimes`, `however`, `socially`, `emotionally` gibi kalıntılar Türkçeye çevrilir
- fallback AI yorum bloklarında `Paragraf X` gibi teknik subtitle etiketleri kaldırıldı
- `Analiz Katmanı X` subtitle etiketleri kaldırıldı
- uzun metinler tek blok yerine daha doğal paragraf grupları halinde render edilir
- tek satır sonu ile gelen LLM paragrafları normalize edilerek daha doğru bölümleme yapılır

Amaç:
- kullanıcıya tamamen Türkçeye yakın, akıcı bir AI yorum deneyimi sunmak
- keyfi karakter kırılımı yerine daha doğal paragraf akışı sağlamak

Ek bug fix (AI paragraf bölünmesi):
- `5. ev`, `11. ev` gibi astroloji derece/ev ifadelerinde nokta cümle sonu sanıldığı için yanlış bölünme yaşanıyordu
- cümle bölme regex'i yalnızca yeni cümle büyük harfle başlıyorsa bölünecek şekilde güncellendi
- `Muaz'insometimes` gibi boşluksuz İngilizce kırıntılar için boşluk onarımı + ek çeviri kuralları eklendi

#### 10.36.13 AI Yorumlarında Çok Dilli Artefakt Temizliği (Kök Neden + Kalıcı Fix)

Kullanıcı ekran görüntüsünde görülen `poççğimiz`, `nguồnını`, `worldsine` gibi Türkçe olmayan/bozuk ifadelerin kök nedeni tespit edildi:

- `natal_v2` backend normalizer JSON şemasını doğruluyordu ancak dil kalitesi/çok dilli artefakt temizliği yapmıyordu
- frontend çeviri katmanı yalnızca astroloji terimlerini (gezegen/açı) çeviriyordu
- bu yüzden LLM'in bazen ürettiği bozuk çok dilli tokenlar UI'a sızıyordu

Kalıcı çözüm:
- `ai-orchestrator` içinde `normalizeParagraph` ve `normalizeUiTitle` akışına `sanitizeAiLanguageArtifacts(...)` eklendi
- yapışık iyelik+İngilizce tokenlar (`Muaz'insometimes`) ayrıştırılıp Türkçeleştiriliyor
- gözlenen bozuk tokenlar (`worldsine`, `nguồnını`, `poççğimiz`) normalize ediliyor
- frontend `translateAstroTermsForUi(...)` içine de aynı düzeltmeler eklendi (cache'li eski yorumları da anlık düzeltmek için)

#### 10.36.14 Yıldız Kartı (Synastry) Referans Tasarım Geri Dönüşü + İlişki Tipi Bazlı Profesyonel Tema

Kullanıcı referans görseline göre `Yıldız Kartı` bileşeni tekrar ele alındı ve güncel versiyondaki sapma giderildi.

Yapılanlar:
- `LOVE` kartı referanstaki pastel/lila estetiğe geri yaklaştırıldı (`AŞK UYUMU • SYNASTRY KARTI`)
- isim satırı altına referans görseldeki kısa açıklama metni (summary) tekrar eklendi
- her ilişki tipi için (`LOVE`, `FRIENDSHIP`, `BUSINESS`, `FAMILY`, `RIVAL`) ayrı profesyonel renk sistemi tanımlandı:
  - arka plan gradient
  - skor kapsülü gradient/border/shadow
  - metrik bandı/panel kart/özet/footer tonları
  - galaksi glow + bulut renkleri
- dekoratif katman ilişki tipine göre ayarlandı (kalp motifleri gerekli tiplerde açık)
- kart kompozisyonu korunarak tüm ilişki tiplerinde içerik + görsel uyum güçlendirildi

Teknik not:
- tema sistemi `relationTheme(...).visual` altında merkezileştirildi
- `MetricRow` ve `InsightPanel` bileşenleri tema renklerini prop ile alacak şekilde güncellendi
- galaksi arka plan SVG'si tema bazlı renk alanlarını kullanır hale geldi

#### 10.36.15 `share-card-preview` Ekranının Güncel Yıldız Kartı Tasarımına Geçişi

Kullanıcı bildirimi: `http://localhost:8090/share-card-preview?...` linki hâlâ eski kart ekranını (`StoryCardPreview`) açıyordu.

Yapılan düzeltme:
- `ShareCardPreviewScreen` artık eski `StoryCardPreview` yerine güncel `MatchCard` bileşenini render eder
- böylece `share-card-preview` ve `match-card-preview` görsel dili tekilleştirildi
- `matchId` üzerinden `getSynastry` çağrısı eklenerek ilişki tipi (`relationshipType`) ve resmi skor meta verileri (`scoreBreakdown`, `displayMetrics`) karta bağlandı
- route paramı varsa `relationshipType/relationLabel` aktarımı desteklendi
- çağıran ekranlarda (`compare/index`, `MatchOverview`, `CompareMatrix`) `share-card-preview` yönlendirmelerine `relationshipType` (ve uygun yerde `relationLabel`) paramları eklendi

Sonuç:
- `share-card-preview` linki artık güncel kartı gösterir
- ilişki türüne göre renk sistemi ve içerik düzeni doğru şekilde çalışır

#### 10.36.16 `share-card-preview` için Profesyonel Paylaşım Atölyesi

Kullanıcı talebi doğrultusunda paylaşılabilir kart ekranına profesyonel paylaşım alanı eklendi.

Eklenenler:
- yüksek çözünürlüklü kart capture (gizli `ViewShot`, 1080x2160)
- otomatik görsel üretimi (ilk render sonrası auto-generate)
- aksiyonlar:
  - `Sistemde Paylaş`
  - `Instagram Story`
  - `Galeriye Kaydet`
  - `Kartı Yeniden Oluştur`
- başarı/hata bannerları ve izin yönlendirmeli hata yönetimi (`ShareServiceError`)
- `share-card-preview` artık hem güncel kartı gösterir hem de aynı ekran içinde üretip paylaşır

Ek UX düzenlemesi (`share-card-preview`):
- `Sistemde Paylaş` butonu `Hemen Paylaş` olarak güncellendi
- paylaşım alanı metin ağırlıklı yapıdan ikon odaklı 2x2 hızlı aksiyon düzenine geçirildi
  - Hemen Paylaş
  - Story
  - Kaydet
  - Yenile
- aksiyon kartlarında ikon boyutu artırıldı, etiketler kısaltıldı

#### 10.36.17 Paylaşılabilir Kartta Kırpılma Azaltma (Sade Metin + Sığan Layout)

Kullanıcı geri bildirimi: paylaşılabilir kartta panel metinleri fazla kırpılıyor ve bazı ifadeler agresif ellipsis ile kesiliyordu.

Yapılan iyileştirmeler (`MatchCard`):
- kart metinleri için yeni `concise(...)` yardımcı fonksiyonu eklendi
  - ilk cümle/ilk anlamlı bölüm seçilir
  - dolgu ifadeleri sadeleştirilir
  - daha kısa, kart dostu metin üretilir
- panel içerikleri (LOVE / FRIENDSHIP / BUSINESS / FAMILY / RIVAL) daha kısa cümlelerle yeniden düzenlendi
- `trait note` ve `summary` kaynaklı uzun ifadeler kısa versiyona normalize edildi
- panel render tarafında `clip(...)` yerine kritik alanlarda `concise(...)` kullanıldı
  - duo satırları
  - başlık altı vurgu
  - lead/callout/footnote satırları
- isim altı açıklama (`summary`) daha kısa formatta üretilir hale getirildi

Tasarım/okunabilirlik dokunuşları:
- panel içi metin tipografisi karta sığması için dengelendi
  - uzun satırlarda taşma yerine daha kontrollü kısa metin
  - alt satır yoğunluğu azaltıldı
- duo satır değerleri tek satırdan 2 satıra açılarak isim+özellik kırpılması azaltıldı

Sonuç:
- kart genel estetiği korunarak kırpılan metin oranı düşürüldü
- cümleler daha kısa, okunabilir ve paylaşım görseline uygun hale geldi

#### 10.36.18 Kırpılma Sert Azaltma + Story Aksiyonunun Kaldırılması

Kullanıcı geri bildirimi üzerine paylaşılabilir kartta kalan kırpılmalar ve Story aksiyonu yeniden düzenlendi.

Kırpılma/sadeleştirme tarafı (`MatchCard`):
- `concise(...)` fonksiyonu artık ellipsis (`…`) üretmeden, kelime sınırında kısa metin döner
- metin hâlâ uzunsa genel/sade bilgiye düşer (`Denge korunuyor` fallback)
- panel render limitleri daha da daraltıldı (kart içine güvenli sığma için)
  - duo satırı, vurgu, lead/callout/footnote ve generic line alanları
- isim satırında uzun adlar için `adjustsFontSizeToFit` açıldı
- alt özet bandı kısa etiketlerle sadeleştirildi (`En güçlü bağ`, `Dikkat`)
- footer hashtag satırı kısaltıldı

Paylaşım tarafı (`ShareCardPreviewScreen`):
- `Story` hızlı aksiyonu tamamen kaldırıldı
- paylaşım paneli 3 aksiyona indirildi:
  - `Hemen Paylaş` (tam genişlik, ana aksiyon)
  - `Kaydet`
  - `Yenile`
- `Hemen Paylaş` sistem paylaşım menüsünü açar; cihazda yüklüyse Instagram dahil uygulamalar görünür
- Story kaynaklı hata yüzeyi kapatıldı

Sonuç:
- kart metinleri daha sade ve daha az kırpılmış görünür
- paylaşım akışı tek ve güvenli ana rota üzerinden ilerler

#### 10.36.19 Paylaşılabilir Kartta İlişki Tipi Sabitleme (Kategori Doğruluğu)

Kullanıcı geri bildirimi: `İş Uyumu` seçildiğinde paylaşılabilir kart bazen `Aşk` temasıyla açılıyordu.

Kök neden:
- `share-card-preview` ekranında backend `getSynastry(matchId)` sonucu, route ile gelen seçili `relationshipType` değerini ezebiliyordu
- `parseRelationshipType(...)` fonksiyonundaki string replace yaklaşımı bazı değerlerde güvenilir değildi (ör. friendship türevleri)

Yapılan düzeltmeler:
- `parseRelationshipType(...)` alias-map tabanlı güvenli çözüme geçirildi
  - LOVE / BUSINESS / FRIENDSHIP / FAMILY / RIVAL için Türkçe+İngilizce alias desteği
  - normalize adımı ile (tr karakter katlama + temizleme) daha dayanıklı eşleme
- `share-card-preview` içinde ilişki tipi önceliği güncellendi:
  - **1. öncelik:** route paramındaki seçili tip
  - **2. öncelik:** backend synastry tipi
- `preview` oluşturulurken de route tipi öncelikli hale getirildi (kategori drift engellendi)
- Compare ana ekranından (`/(tabs)/compare/index`) paylaşım route’una `relationLabel` de geçirildi
- Compare Matrix paylaşım geçişinde `relationLabel` yoksa `relationshipType` paramından türetilen fallback eklendi

Sonuç:
- hangi ilişki kategorisi seçildiyse paylaşılabilir kart aynı kategori temasında açılır
- `İş Uyumu` -> BUSINESS kartı, `Arkadaşlık` -> FRIENDSHIP kartı vb. tutarlı çalışır

#### 10.36.20 İlişki Tipine Özel Karakter Bütçesi + Smoke Check Tablosu

Kullanıcı talebi doğrultusunda paylaşılabilir kart metin kırpılması bir üst seviyeye taşındı.

Yapılanlar (`MatchCard`):
- `relationCopyBudget(...)` eklendi
  - `LOVE`, `FRIENDSHIP`, `BUSINESS`, `FAMILY`, `RIVAL` için ayrı metin bütçeleri tanımlandı
  - bütçeler: `summary`, `summaryLine`, `traitList`, `duoRow`, `panelLead/callout/footnote`, `genericLead/bullet`, `strongest/caution`
- `buildPanels(...)` fonksiyonu artık ilişki tipine özel `CardCopyBudget` ile çalışıyor
- `InsightPanel` render katmanı da aynı bütçeyi kullanıyor (tek yerde limit kontrolü)
- böylece her ilişki tipi kendi metin yoğunluğuna göre düzenleniyor; kırpılma/taşma riski azaltıldı

Smoke-check dokümanı:
- yeni dosya eklendi:
  - `docs/kozmik_map/SHARE_CARD_RELATIONSHIP_SMOKE_CHECK.md`
- 5 ilişki tipi için hızlı doğrulama tablosu ve adım adım test akışı tanımlandı

Sonuç:
- ilişki tipine göre kart içi metin yoğunluğu daha kontrollü
- QA tarafında tip doğrulama (Aşk/İş/Arkadaşlık/Aile/Rekabet) tek tablodan hızlı yapılabilir

Ek düzeltme:
- `CompareMatrixScreen` içindeki `relationLabelFromParam` yardımcı fonksiyonunda `friendship` gibi değerlerin yanlışlıkla `İş Uyumu`na düşmesine neden olabilecek `includes('is')` kontrolü kaldırıldı.

#### 06.50.43 Harita Yorumu + Kozmik Ana Tema UX Refactor

Kullanıcı geri bildirimi: `Harita Yorumu` ve üstteki ana yorum alanı fazla yazı ağırlıklı kaldığı için yorucu hissediyordu.

Yapılan tasarım/kod güncellemeleri (`StructuredNatalAiInterpretation`):
- üst blok tamamen yeniden kurgulandı
  - başlık `Kozmik Ana Tema` olarak sadeleştirildi
  - uzun paragraf yerine kısa bir ana cümle + destekleyici ikinci satır kullanıldı
  - altına 3 adet hızlı okuma kartı eklendi:
    - `Ana enerji`
    - `Denge noktası`
    - `Hayata yansıması` / ilk gezegen vurgusu
- yorum akışına `Nereden Başlamalı?` bölümü eklendi
  - ilk 3 yorumsal başlık küçük özet kartlarla önceden gösteriliyor
  - kullanıcı tüm akordiyonları açmadan hangi başlığa gireceğini anlayabiliyor
- `Harita Yorumu` akordiyon başlıkları artık kendi kısa özetini subtitle alanında gösteriyor
- her akordiyon gövdesinin en üstüne `Bu başlığın özeti` kartı eklendi
  - uzun paragraf doğrudan yüzeye çıkmak yerine önce kısa anlam katmanı veriliyor
- günlük hayat örnekleri ve vurgu maddeleri korunarak okunabilir akışta aşağı taşındı
- gezegen yorumları da aynı mantıkla hafifletildi
  - başlık altında kısa etki cümlesi
  - vurgu pill’leri
  - detay isteyen kullanıcı için daha aşağıda tam açıklama
- kapanış kartı tek paragraf yığını olmaktan çıkarılıp kısa `Yanında Kalsın` notuna dönüştürüldü

Ürün yaklaşımı:
- varsayılan görünüm artık `taranabilir`
- derinlik kaybolmadı; sadece ikinci katmana alındı
- kullanıcı ilk bakışta "bu yorum bana ne söylüyor?" sorusunun cevabını birkaç saniyede alabiliyor

Doğrulama:
- `npx tsc --noEmit --pretty false` çalıştırıldı
- bu refactor sonrası `StructuredNatalAiInterpretation.tsx` için yeni TypeScript hatası kalmadı
- repoda önceden mevcut başka TypeScript hataları ayrı olarak devam ediyor

#### 08.28.34 Harita Yorumu Prod-Ready Temizlik

Kullanıcı talebi: yorum ekranında `version` benzeri teknik his veren yazılar ve mock/fallback tadı veren yardımcı metinler kaldırılmalı.

Yapılan temizlikler:
- `StructuredNatalAiInterpretation` içinde kullanıcıya görünen teknik/mode pill’leri kaldırıldı
  - `katmanlı yorum`
  - `özet mod`
- yapay/fallback hissi veren section etiketleri kaldırıldı
  - `önce buna bak`
  - `özet`
  - `başlık`
  - `özet yorum`
- gerçek veri yoksa sahte preview metni basılmıyor
  - önceki fallback: `Bu başlık, haritanın bu alandaki ana dinamiğini özetler.`
  - yeni davranış: preview yoksa ilgili kart/alt etiket üretilmiyor
- plain-text modunda üst özet kart başlıkları daha doğal hale getirildi
  - sabit jenerik etiketler yerine mümkün olduğunda gerçek bölüm başlıkları kullanılıyor

Metin temizleme katmanı (`astroTextProcessor`):
- AI çıktısı düz metin moda düşerse JSON/meta satırları kullanıcıya sızmasın diye filtre eklendi
- aşağıdaki teknik satırlar otomatik ayıklanıyor:
  - `version:`
  - `tone:`
  - `sections:`
  - `planetHighlights:`
  - `opening:`
  - `coreSummary:`
  - `closing:`
  - benzeri JSON key/meta satırları
- ayrıca tek başına kalan `{ } [ ]` gibi JSON parçaları da ayıklanıyor

Sonuç:
- yorum alanı daha ürünleşmiş ve sessiz görünüyor
- kullanıcı yalnızca gerçek yorum içeriğini görüyor
- parse uyumluluğu için teknik alanlar backend/normalization tarafında korunuyor, fakat UI’da görünmüyor
