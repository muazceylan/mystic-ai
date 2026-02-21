# Mystic AI — Mobil UI / UX İyileştirme Planı

Bu doküman, repo içindeki hızlı değerlendirmeye dayanarak önerilen tüm UI/UX geliştirmelerini listeler. Seninle maddeleri tek tek işleyip PR'lara dönüştüreceğiz — önce hangi maddeyle başlamak istediğini söyle.

## Özet
- Amaç: Okunabilirlik, erişilebilirlik, görsel tutarlılık, performans ve onboarding dönüşümünü artırmak.
- Kapsam: Onboarding, Ana Ekran (Transit, Günün Sırrı, SWOT), Tasarım Sistemi, A11y, Performans, Kod yapısı.

## Hızlı Kazançlar (High impact, Low effort)
1. [x] Kontrast ve metin kontrast testleri — düşük kontrastlı metinleri güncelle (AA uyumu).
2. [x] Touch target standartları — tüm ikon ve butonları en az 44×44 px yap, accessibilityLabel ekle.
3. [x] Skeleton / placeholder yükleyiciler — DailySecret, SkyPulse, SWOT için.
4. [ ] Hata durumları — her fetch için kullanıcıya retry CTA ve kısa açıklama göster.
5. [x] `src/constants/colors.ts` üzerinden inline renkleri centralize et.

## Orta Vadeli (Medium effort)
1. [x] Tasarım tokenları (renk, tipografi, spacing, radius) oluşturulması.
2. [x] Atomic UI kütüphanesi: Button, IconButton, Card, Badge, Skeleton, ListItem.
3. [x] Onboarding UX iyileştirmeleri: adım göstergeci (OnboardingProgressBar), yardımcı metin — input mask & validation kaldı.
4. [ ] Metinler için özet-detay pattern: ana ekranda kısa özet + "Detayları Göster" ile genişletme.
5. [ ] Slider görsel odaklama: aktif slide için scale/opacity animasyonu.

## Uzun Vadeli (Higher effort)
1. Offline-first ve cache stratejisi (MMKV / TanStack Query integration).
2. Kapsamlı erişilebilirlik denetimleri ve düzeltmeleri (screen reader, dynamic type).
3. A/B testleri (kısa vs uzun günlük mesaj), analitik entegrasyonu.
4. E2E testler ve görsel regresyon (Detox / Playwright).

## Tasarım Sistemi — Önerilen Tokenlar
- Renk: primary, primary-700, bg, surface, success, warning, danger, text-primary, text-secondary
- Tipografi: H1, H2, H3, Body, Small (boyut + line-height)
- Spacing: 4pt grid (xs, sm, md, lg)
- Radius: 4, 8, 12, 16, 999

## Erişilebilirlik (A11y) Checklist
- Metin kontrastlarını AA seviyesine getir.
- Tüm interaktif öğelere accessibilityLabel ve accessibilityRole ekle.
- Touch target >= 44px.
- Dynamic font scale desteği.
- Görsel olmayan bildirimler için screen-reader metinleri.

## Performans Önerileri
- Lazy load ağır ekranlar / code-splitting (expo-router dinamik import).
- Görsel optimizasyon (WebP, resize).
- Hermes kullanımı ve profilleme ile hot-path optimizasyonu.
- Ağ caching (TanStack Query) ile tekrar yüklemeleri azalt.

## Ekran Bazlı Kısa Notlar
- Onboarding: adım sayacı, net açıklamalar, otomatik lokasyon önerisi.
- Ana ekran: metinleri kısalt, CTA'ları belirginleştir, skeleton ekle.
- Transit kartı: action / caution öğelerini kısa cümlelere indir ve icon/renk ile vurgula.
- SWOT kartları: başlık + kısa özet + “Detay” açılır bölümü.

## Örnek İş Listesi (Task Queue)
- [x] Kontrast düzeltmeleri (global renk tokenları ile)
- [x] Skeleton loader: DailySecret, SkyPulse, SWOT
- [x] accessibilityLabel ekleme (ikonlar, butonlar)
- [x] Button & Card atomic bileşenleri
- [x] Onboarding: stepper (OnboardingProgressBar) + yardımcı metinler

## Nasıl İlerleyeceğiz
1. Sen hangi maddeyle başlamak istediğini söyle.  
2. Ben ilgili dosyaları düzenleyip küçük, izlenebilir PR'lar oluşturuyorum.  
3. Her PR sonrası linter/a11y kontrolü yapıp düzeltmeler eklerim.

## Notlar
- Tüm metinler i18n ile uyumlu kalacak (src/i18n).  
- Önce UX hatalarını (a11y, loading, error handling) düzeltmek kullanıcı memnuniyetini hızla artırır.

---
## Kalan İşler — Önem Sırası (Devam)

### 1. Kritik (Önce yapılacak)
- [ ] **Hata durumları** — Her fetch için retry CTA ve kısa açıklama (kullanıcı deneyimi için kritik)

### 2. Yüksek Öncelik
- [ ] **Metin özet-detay pattern** — Ana ekranda kısa özet + "Detayları Göster" (okunabilirlik, CTA belirginliği)
- [ ] **Onboarding validation** — Input mask & validation tamamlanması

### 3. Orta Öncelik
- [ ] **Slider görsel odaklama** — Aktif slide için scale/opacity animasyonu

### 4. Uzun Vadeli
- [ ] Offline-first ve cache stratejisi (MMKV / TanStack Query)
- [ ] Kapsamlı erişilebilirlik (screen reader, dynamic type)
- [ ] A/B testleri, analitik entegrasyonu
- [ ] E2E testler (Detox / Playwright)

---
Hazırsan sıradaki maddeyi seç; öneri: "Hata durumları" ile başla.

