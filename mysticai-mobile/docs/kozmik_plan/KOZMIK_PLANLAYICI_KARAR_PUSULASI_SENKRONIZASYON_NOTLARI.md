# Kozmik Planlayıcı & Karar Pusulası Senkronizasyon Notları

Bu doküman, `Karar Pusulası` (Ana Sayfa) ve `Kozmik Planlayıcı` (Takvim) modüllerinin senkronizasyonu için yapılan son geliştirmeleri özetler.

## 1. Kök Problem ve Çözüm (Karar Pusulası çalışmıyordu)

### Problem
- Mobil ana sayfa `GET /api/v1/cosmic/summary` çağrısı yapıyordu.
- `api-gateway` içinde `/api/v1/cosmic/**` route'u tanımlı değildi.
- Sonuç: Home widget 404 alıyor, `Karar Pusulası` veri çekemiyordu.

### Çözüm
- `api-gateway` route eklendi:
  - `/api/v1/cosmic/** -> lb://astrology-service`

## 2. Merkezi Skor Servisi (Single Source of Truth)

### Backend
- `CosmicScoringService` merkezi skor servisi kullanılıyor.
- Endpointler:
  - `GET /api/v1/cosmic/summary?date=YYYY-MM-DD`
  - `GET /api/v1/cosmic/planner?month=YYYY-MM` (ve `MM` fallback)
  - `GET /api/v1/cosmic/day-detail?date=YYYY-MM-DD`

### Skor Politikası
- Skorlar `0` olamaz.
- Minimum: `%5`
- Maksimum: `%100`

## 3. Kategori / Alt Kategori Senkronizasyonu

### Kozmik Planlayıcı ↔ Karar Pusulası ortak skor akışı
- Home (`Karar Pusulası`) `cosmic/summary` kullanır.
- Planner grid/legend/dot overlay `cosmic/planner` kullanır.
- Eşleşen category key'lerde aynı merkez servis skorları kullanılır.

### Planner category → Cosmic category key eşlemesi (özet)
- `beauty` -> `beauty`
- `health` -> `health`
- `jointFinance` -> `finance`
- `activity` -> `activity` (önceden `career` idi, düzeltildi)
- `official` -> `official` (eklendi)
- `spiritual` -> `spiritual` (eklendi)
- `family` -> `home` (eklendi)
- `partnerHarmony`, `date`, `marriage` -> `social`
- `transit` -> `transit`
- `moon` -> `moon`

## 4. Yeni / Genişletilmiş Sub-Category Setleri

### Sağlık (`health`)
- `Sağlık Kontrolü` (`CHECKUP`) [mevcut]
- `Diyet` (`DIET_DETOX`) [etiket sadeleştirildi]
- `Tedavi` (`TREATMENT`) [yeni]
- `Dinlenme / Toparlanma` (`REST_RECOVERY`) [mevcut]

### Aktivite (`activity`) [yeni grup + sub-categories]
- `Kültür & Sanat` (`CULTURE_ART`)
- `Alışveriş` (`ACTIVITY_SHOPPING`)
- `Onarım` (`REPAIR`)
- `Ev İşleri` (`HOUSEWORK`)
- `Spor` (`SPORT`)
- `Parti / Eğlence` (`PARTY_FUN`)
- `Sosyal Etkinlik` (`SOCIAL_EVENT`)
- `Tatil` (`VACATION`)

### Resmi (`official`) [yeni grup + sub-categories]
- `Hukuk` (`LAW`)
- `Girişim` (`VENTURE`)
- `Toplantı` (`OFFICIAL_MEETING`)
- `Tez / Araştırma` (`THESIS_RESEARCH`)

### Manevi (`spiritual`) [genişletildi]
- `İbadet` (`WORSHIP`) [yeni]
- `Dua` (`PRAYER`) [yeni]
- `Meditasyon` (`MEDITATION`) [mevcut]
- `Eğitim / Sınav` (`EDUCATION_EXAM`) [mevcut]
- `Derinleşme Seansı` (`DEEP_SESSION`) [mevcut]

## 5. Kişiselleştirilmiş Filtreleme Kuralları

### Cinsiyet
- `FEMALE` kullanıcı için:
  - `Saç / Sakal Kesimi` etiketi -> `Saç Kesimi`
  - Sakal odaklı isimlendirme gizlenir (etiket seviyesinde)

### Medeni Durum
- `MARRIED` kullanıcı için:
  - `İlk Buluşma` (`FIRST_DATE`) kaldırılır
  - `Flört` etiketi `Flört / Eş Uyumu` olarak optimize edilir

## 6. Ana Sayfa (Karar Pusulası) - 3 Kart Kuralı

- Home widget yalnızca 3 odak kart gösterir:
  - En yüksek 2 kart (`Fırsat`)
  - En düşük 1 kart (`Uyarı`)
- Backend `focusCards` sırası dikkate alınır.
- Backend focus seçiminde `Transit` ve `Ay` sentetik kalemleri hariç tutulur (pratik karar kartları öne çıkar).

## 7. Kozmik Planlayıcı (Takvim) - Dot & Legend

- Seçili kategoriye göre gün hücrelerinde sub-category renkli noktalar görünür.
- Takvim altında dinamik legend gösterilir.
- `activity`, `official`, `spiritual`, `family` için de cosmic legend/dot mapping aktif hale getirildi.

## 7.1 Planner Detay Paneli - Tek Motor (Cosmic Day Detail)

- Planner detay paneli artık legacy `planner/full-distribution FULL` çağrısına bağımlı değildir (mapped kategorilerde).
- Detay panel açıldığında `GET /api/v1/cosmic/day-detail` çağrılır.
- `Doğru Zaman / Kaçınılmalı / Neden? / Supporting aspects` içerikleri `CosmicScoringService` üzerinden üretilir.
- `date`, `marriage`, `partnerHarmony` sekmeleri `social` cosmic kategorisine maplenir.
- `jointFinance -> finance`, `family -> home`, `color -> color`, `recommendations -> recommendations` maplenir.
- Böylece planner grid + legend + detail panel aynı scoring motorundan beslenir.

## 8. Renk Kodları (Örnekler)

### Güzellik
- `Tüy Azaltma` -> Teal
- `Saç Kesimi` -> Pembe
- `Cilt Bakımı` -> Sarı
- `Estetik` -> Mavi
- `Tırnak Bakımı` -> Gri

### Manevi
- `İbadet` -> Yeşil
- `Dua` -> Pembe
- `Meditasyon` -> Mor
- `Eğitim / Sınav` -> Mavi
- `Derinleşme Seansı` -> Gri

## 9. Çalışma Doğrulaması (Bu değişiklikler için)

Aşağıdaki komutlarla doğrulama alındı:

```bash
mvn -pl api-gateway -am -DskipTests compile
mvn -pl astrology-service -am -DskipTests compile
npx expo export --platform ios --output-dir /tmp/mystic-export-ios --clear
```

### Sonuç
- `api-gateway` compile: ✅
- `astrology-service` compile: ✅
- `mysticai-mobile` iOS bundle/export: ✅

## 10. Güncel Mimari Durum (Tek Motor)

- Home kart skorları, planner grid/dot/legend ve planner detay paneli (mapped kategoriler) merkezi `CosmicScoringService` üzerinden çalışır.
- Planner detay paneli kategori bazlı `GET /api/v1/cosmic/details` kullanır (daha hafif payload).
- Legacy `planner/full-distribution FULL` yalnızca cosmic mapping olmayan fallback durumlarında devreye girer.

## 11. Taxonomy Genişletme (Son Güncelleme)

### Yeni / Genişletilmiş Alt Kategoriler
- `health`: `operation`
- `finance`: `big_purchase`
- `career`: `new_job`, `career_education`, `seniority`, `resignation`, `entrepreneurship`
- `official`: `official_documents`, `applications`, `public_affairs`, `law`, `venture`, `meeting`, `thesis_research`
- `home`: `cleaning`, `moving`, `renovation`, `decoration`, `plant_care`
- `spiritual`: `meditation`, `worship`, `prayer`, `inner_journey`, `ritual`

### Sıralama Politikası
- `DailyLifeGuideResponse.activities`: yüksek skordan düşüğe sıralı
- `DailyLifeGuideResponse.groups`: ortalama skora göre yüksekten düşüğe sıralı
- `Cosmic day-detail` kategori listesi: kategori skoruna göre yüksekten düşüğe sıralı
- Planner sub-category legend (UI): seçili gün skoruna göre yüksekten düşüğe sıralı

### İsimlendirme Senkronizasyonu
- `family` UI etiketi -> `Ev İşleri` (`Home Tasks`)
- `spiritual` UI etiketi -> `Maneviyat` (`Spirituality`)
- Dock label override’ları merkezi `CosmicConstants.ts` içine taşındı.

### Not (Flyway)
- İstenen `star_mate_categories` / `sub_categories` tabloları mevcut migration’larda bulunmuyor.
- Bu sprintte taxonomy senkronizasyonu servis seviyesi (`DailyLifeGuideService` + `CosmicScoringService`) üzerinden uygulandı.

## 12. Hiyerarşik Skorlama & UI Refactor (Bottom-Up)

### Backend
- Ana kategori skorları alt kategori skorlarının aritmetik ortalamasından üretilir (`bottom-up aggregation`).
- `DailyLifeGuideResponse.activities` ve `groups` skor bazında sıralı döner (yüksek -> düşük).
- Yeni endpoint: `GET /api/v1/cosmic/details`
  - Parametreler: `userId`, `categoryKey`, `date`, `locale`, `gender`, `maritalStatus`
  - Seçili kategoriye ait sub-category analiz listesini döndürür.

### Planner (Takvim)
- `Tümü (All)` sekmesi UI’dan kaldırıldı; ekran ilk görünümde ilk görünür kategoriye odaklanır.
- Detay modal artık seçili ana kategori altında sub-category analiz listesi gösterir:
  - ikon
  - isim
  - skor (%)
  - alt kategoriye özel yorum (`insight`)
  - teknik açıklama (`technicalExplanation`)
- Planner detail fetch payload’u optimize edildi:
  - `GET /api/v1/cosmic/day-detail` yerine kategori bazlı `GET /api/v1/cosmic/details`
  - client tarafında mevcut günlük cache içine merge edilir.

## 13. Yıldız Kategorileri UI Revizyonu (Scrollable Detail Panel)

- Detay modalındaki `Teknik Kırılım` başlığı `Yıldız Kategorileri` olarak güncellendi.
- Alt kategori analiz listesi artık `ScrollView` içinde render edilir; dikey taşma durumunda ekran bozulmaz.
- Üst özet alanı (tarih, ana skor, kısa özet) sabit kalır; yalnızca alt liste alanı kayar.
- Alt kategori kartlarına inner-card görünümü eklendi:
  - sol tarafta renkli glow bar
  - ikon + alt kategori ismi
  - kısa yorum + teknik not
  - sağda skor ve progress bar
- Scroll sırasında görünür alana yeni giren alt kategori kartları için hafif haptic tetiklenir (throttled).
- `detailScrollContent` sonuna `paddingBottom: 40` eklenerek son kartın sıkışması önlendi.

### Home (Karar Pusulası)
- Kartlar artık `activity/sub-category` yerine `main-category` seviyesinde gösterilir.
- 3 kart kuralı korunur:
  - en yüksek 2 ana kategori
  - en düşük 1 ana kategori
- Kart genişletildiğinde alt kategoriler skor + kısa tavsiye ile listelenir.
- Ana kategori skoru, görünür alt kategorilerin ortalamasıdır (local hide settings dahil).
