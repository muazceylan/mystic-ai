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
- `Mystic AI'da Aç` (deep-link fallback mantığı)
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
