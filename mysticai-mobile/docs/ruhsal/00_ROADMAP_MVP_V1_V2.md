# Ruhsal Pratikler Modulu - Yapilacaklar Listesi (MVP -> v1 -> v2)

Bu belge, gelistirme islerini uygulanabilir bir sira ile baslatir. Amaç, mevcut astroloji modullerini riske atmadan yeni modulu kontrollu sekilde yayina almaktir.

## Canli Sprint Durumu (Guncel)

### Sprint 0 - Planlama ve Dokumantasyon `[x]`

- [x] Urun/UX/DB/API/algoritma/mobil mimari planlari hazirlandi
- [x] `mysticai-mobile/docs/ruhsal/*` dokuman paketi olusturuldu
- [x] Sprint bazli roadmap ve guvenlik/gizlilik notlari yazildi

### Sprint 1 - Backend Foundation (spiritual-service) `[~]`

- [x] `spiritual-service` Maven modulu olusturuldu
- [x] Spring Boot app + security + controller/service/repository/entity skeleton kuruldu
- [x] Flyway migration + seed eklendi
- [x] `/daily/*`, `/log/*`, `/stats/weekly` endpoint skeleton'lari eklendi
- [x] Backend compile kontrolu alindi
- [ ] `api-gateway` route tanimi yapilacak
- [ ] Idempotency / rate limit production implementasyonu yapilacak

### Sprint 2 - Gunluk Icerik Secimi (Deterministik + Snapshot) `[~]`

- [x] `prayer_sets`, `prayer_set_items`, `asma_daily`, `meditation_daily` snapshot altyapisi eklendi
- [x] `GLOBAL` scope deterministik secim uygulandi
- [x] Basic cooldown (son gosterimleri azaltma) eklendi
- [x] Basic kategori dengesi (SUKUR/KORUNMA/HUZUR onceligi) eklendi
- [ ] `PER_USER` scope
- [ ] A/B varyant atama/persist (3/5 dua)

### Sprint 3 - Mobil Iskelet ve Home Entegrasyonu `[~]`

- [x] `mysticai-mobile/src/spiritual` domain yapisi olusturuldu
- [x] Expo Router route'lari (`/spiritual/*`) eklendi
- [x] Home ekranina `Ruhsal Pratikler` modulu eklendi (legacy home + HomeV2)
- [x] Dua/Esma/Meditasyon/Gunluk/Ayarlar ekran skeleton'lari eklendi
- [ ] UI polish + i18n entegrasyonu

### Sprint 4 - Mobil Etkilesim ve Offline Dayaniklilik `[~]`

- [x] Dua sayac + akış skeleton'u
- [x] Meditasyon timer skeleton'u
- [x] Log POST fallback offline pending queue skeleton'u
- [x] Secure storage adapter/fallback skeleton'u
- [ ] Gercek secure storage + encryption
- [ ] Background sync / retry policy / duplicate koruma

## Stratejik Hedef

- `Astroloji` ana urun degerini korumak
- `Ruhsal Pratikler` modulu ile gunluk tekrar davranisi ve retention artirmak
- Dini hassasiyete uygun, bilgilendirme odakli ve guvenli bir deneyim sunmak

## Fazlama Ozeti

- `MVP`: Temel gunluk deneyim + log + cache + ayarlar
- `v1`: Arama/filtre/favoriler/okuma modu/TTS/A-B altyapisi
- `v2`: Kisisellestirme, gelismis offline, cloud sync, coklu dil icerik olgunlasmasi

## MVP (Oncelik: Yuksek)

### 1. Mimari ve Proje Hazirligi

- [x] `spiritual-service` (onerilen) veya `astrology-service` icinde `spiritual` paketi ac
- [ ] `api-gateway` route tanimla: `/api/v1/spiritual/**`
- [x] JWT claim -> `userId` okuma standardini netlestir (`subject` veya custom claim) (skeleton)
- [x] Redis kullanim alanlarini belirle: rate limit, idempotency, gunluk cache (tasarim + servis bagimliligi)

Kabul kriterleri:
- Servis ayaga kalkar
- Health endpoint OK
- Gateway uzerinden authenticated request gecisi dogrulanir

### 2. Veritabani ve Migrationlar

- [x] Tablolari olustur:
  - `prayers`
  - `prayer_sets`
  - `prayer_set_items`
  - `dhikr_entries`
  - `asmaul_husna`
  - `asma_daily`
  - `meditation_exercises`
  - `meditation_daily`
  - `meditation_sessions`
  - `user_preferences`
- [x] Index ve unique constraintleri ekle
- [x] Gerekli check constraintleri ekle (`entry_type`, nullable FK kurallari)
- [x] Seed script (template/test data) yaz

Kabul kriterleri:
- Flyway migration clean database uzerinde sorunsuz calisir
- Seed sonrasi `/daily/*` endpointleri veri dondurebilir

### 3. Icerik Modelleme ve Dogruluk Guvencesi (MVP seviyesi)

- [x] Her icerikte `sourceLabel`, `sourceNote`, `disclaimerText` alanlarini zorunlu tut
- [x] Placeholder tabanli seed icerikleri olustur (gercek dini metin yerine template)
- [ ] `content/report` endpointi icin tablo ve temel POST endpointi ac
- [x] Mobilde "Hatali icerik bildir" butonunu ekle (ayarlar skeleton)

Kabul kriterleri:
- Her icerik detay ekraninda kaynak notu + bilgilendirme gorunur
- Kullanici rapor gonderebilir

### 4. Gunluk Icerik Secimi (Deterministik)

- [x] `GET /daily/prayers`, `GET /daily/asma`, `GET /daily/meditation` endpointleri
- [x] Deterministik seed mekanizmasi (`date + userId` veya `global`)
- [x] Basic cooldown (son 14 gun tekrarini azalt)
- [x] Dua seti icin kategori dengesi (haftada sukur/korunma/huzur)
- [x] Snapshot tablolara yazma (`*_daily`, `prayer_sets`)

Kabul kriterleri:
- Ayni gun, ayni scope icin ayni sonuc dondurulur
- Son 14 gunde tekrar orani gozle gorulur sekilde azalir

### 5. Loglama ve Istatistikler

- [x] `POST /log/prayer`
- [x] `POST /log/asma`
- [x] `POST /log/meditation`
- [x] `GET /log/prayer?from&to`
- [x] `GET /stats/weekly?week=`
- [ ] Idempotency (header bazli) veya `client_session_id` dedupe

Kabul kriterleri:
- Ayni dua/asma ayni gun tekrar kayitlari aggregate edilir
- Haftalik toplam tekrar / streak / en cok okunan dua dondurulur

### 6. Mobil MVP - Home Entegrasyonu (Astrolojiyi Golgelememe)

- [x] `Home` ekranina `Ruhsal Pratikler` bolumu ekle (MVP)
- [x] 3 kart:
  - `Bugunun Duasi`
  - `Bugunun Esmasi`
  - `Bugunun Nefesi`
- [x] `Kisa Dualar` hizli erisim satiri ekle (min 3 item)
- [x] Error/loading/empty durumlari icin ortak UI kullan (modul seviyesinde temel mesajlar)

Kabul kriterleri:
- Home performansinda gozle gorulur regresyon olmaz
- Ruhsal kartlar astroloji ana bolumlerinin onune gecmez (siralama kontrollu)

### 7. Mobil MVP - Dua Akisi

- [x] Bugunun dua listesi ekrani
- [ ] Dua detay ekrani (Arapca/Okunus/Meal sekmeleri)
- [ ] Font buyut/kucult (`A-/A+`)
- [x] Sayaç (`+1`, `+5`, `+10`, basili tut hizli artis)
- [x] Progress bar (onerilen tekrar sayisina gore)
- [x] "Devam et" sirali akisi
- [x] Tamamlandi ozeti + mood/note + log yazma (skeleton/akis icinde)

Kabul kriterleri:
- Sayaç akici calisir
- Network gecikse bile UI donmez (log batching / async submit)

### 8. Mobil MVP - Esma ve Meditasyon Akislari

- [x] Gunun Esmasi ekrani + istege bagli zikir sayaci
- [x] Gunun egzersizi ekrani (baslat/duraklat)
- [x] Timer + faz gosterimi (inhale/hold/exhale)
- [ ] Bitis mini check-in (moodAfter)
- [x] Log kaydi

Kabul kriterleri:
- Timer stabil ve dogru sureyi kaydeder
- Meditasyon ekraninda dini/tibbi iddia dili kullanilmaz

### 9. Mobil MVP - Gunluk ve Ayarlar

- [x] `Dua Gunlugum` ekrani (liste + basic haftalik stats + streak) (skeleton)
- [x] `Ruhsal Ayarlar` ekrani:
  - bildirimler
  - font boyutu
  - TTS toggle (varsayilan kapali)
  - icerik dili (TR)
  - okuma modu
  - gizlilik/export
- [ ] Bildirim tercihleri local + backend preference kaydi

Kabul kriterleri:
- Kullanici ayari sonraki acilista korunur
- Bildirimler zaman secimine gore planlanabilir

### 10. Offline ve Performans (MVP icin kritik)

- [x] Gunun iceriklerini query cache ile sakla (`offlineFirst`) (mevcut proje query persister altyapisi)
- [x] Log POST hatalarinda local pending queue
- [x] Sayaç state local/Zustand
- [ ] Timer icin UI thread dostu implementasyon (Reanimated tavsiye)

Kabul kriterleri:
- Internet yokken bugunun icerikleri cache'den acilir
- Baglanti gelince pending loglar senkronize edilir

## v1 (Urun Kalitesi ve Icerik Deneyimi)

### Icerik ve Kisisel Deneyim

- [ ] `TUM ESMALAR` ekrani (arama + tema filtre + alfabetik)
- [ ] Favoriler (`user_prayer_favorites`)
- [ ] Daha guclu `Kisa Dualar` deneyimi (10-30 sn)
- [ ] Okuma modu: ekran kararmasin + buyuk font + gece modu
- [ ] TTS (TR/AR cihaz destegine gore)

### Istatistik ve Aliskanlik Takibi

- [ ] Takvim/heatmap gorunumu
- [ ] Gun detay ekrani
- [ ] Haftalik/aylik trend kartlari
- [ ] "En cok okunan dua" ve "en duzenli saat" gibi metrikler

### Icerik Yonetimi ve Deneysellik

- [ ] Remote content publish/version endpointi
- [ ] A/B test altyapisi (`3_DUA` vs `5_DUA`)
- [ ] Experiment assignment persistence
- [ ] Icerik yayini icin checksum/version invalidation

## v2 (Olgunlasma ve Olcek)

### Kisisellestirme ve Akilli Secim

- [ ] `PER_USER` gunluk icerik scope (tercih/sure/yogunluk bazli)
- [ ] Gelismis kategori-planlayici (sabah/aksam setleri)
- [ ] Mood gecmisine gore egzersiz oneri agirligi (hassasiyet diliyle)

### Veri Dayanikliligi ve Senkronizasyon

- [ ] JSON export/import
- [ ] Hesap degisince secure sync
- [ ] Gelişmis local encrypted store (opsiyonel SQLite)
- [ ] Veri silme / hesap kapatma akisina entegrasyon

### Operasyonel Olgunluk

- [ ] Headless CMS veya admin panel
- [ ] Editoryal onay workflow
- [ ] Moderasyon ve rapor SLA takibi
- [ ] Gozlemlenebilirlik panelleri (request latency, cache hit, retention funnel)

## Bagimliliklar ve Riskler

### Teknik riskler

- JWT claim formatinin servisler arasi tutarsizligi
- Timer/background davranisi (iOS/Android farklari)
- Push notification izinleri ve teslimati
- Offline queue duplicate log riski

### Icerik/hassasiyet riskleri

- Kaynak notu yetersizligi
- Dini metin varyantlari nedeniyle kullanici guvensizligi
- Meditasyon dilinde dini/tibbi iddia algisi

Azaltma:
- Zorunlu `sourceNote` + `disclaimerText`
- `content/report` butonu
- Editoryal review checklist

## Onerilen Uygulama Sirasi (Pratik)

1. Backend schema + seed + daily endpoints
2. Mobil home kartlar + read-only ekranlar
3. Dua sayaç/log akisi
4. Esma/log akisi
5. Meditasyon timer/log akisi
6. Gunluk/stats
7. Ayarlar + reminderlar
8. Offline queue + polish
