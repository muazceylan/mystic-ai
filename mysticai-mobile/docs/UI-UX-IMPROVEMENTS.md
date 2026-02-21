# Mystic AI — Mobil UI / UX İyileştirme Planı

Bu doküman, repo içindeki kapsamlı analize dayanarak önerilen tüm UI/UX geliştirmelerini listeler. Seninle maddeleri tek tek işleyip PR'lara dönüştüreceğiz — önce hangi maddeyle başlamak istediğini söyle.

## Özet
- Amaç: Okunabilirlik, erişilebilirlik, görsel tutarlılık, performans ve onboarding dönüşümünü artırmak.
- Kapsam: Onboarding, Ana Ekran (Transit, Günün Sırrı, SWOT), Tasarım Sistemi, A11y, Performans, Kod yapısı.

---

# 🔍 UI/UX Analiz Raporu (Güncel)

**Tarih:** 21 Şubat 2025  
**Kapsam:** Ana ekranlar, onboarding, profil, rüyalar, takvim, tasarım sistemi, navigasyon, i18n

---

## 📱 Yeni Tespitler (Güncel Analiz — 21 Şubat 2025)

### i18n Eksikleri (Hardcoded Metinler)
| Ekran / Dosya | Hardcoded Metin | Öneri |
|---------------|-----------------|-------|
| `dreams.tsx` | `MONTHS_TR` (Ocak, Şubat...) | `calendar.months` i18n ile birleştir veya `dreams.months` ekle |
| `dreams.tsx` | "Dinleniyor…", "Ses metne çevriliyor…" | `dreams.listening`, `dreams.transcribing` |
| `dreams.tsx` | "ya da yaz", "düzenle" | `dreams.orWrite`, `dreams.edit` |
| `dreams.tsx` | "Rüyaya başlık ekle (opsiyonel)" | `dreams.titlePlaceholder` ✅ (zaten var, kullanılmamış) |
| `dreams.tsx` | "Kaydet ve Yorumla", "Vazgeç" | `dreams.save`, `dreams.cancel` ✅ (var) |
| `dreams.tsx` | "Tekrar eden semboller" | `dreams.recurringSymbols` (yeni key) |
| `dreams.tsx` | "Hikâye yazılıyor...", "Yapay zeka yazıyor..." | `dreams.storyWriting`, `dreams.aiWriting` |
| `dreams.tsx` | "PDF Hazırlanıyor...", "PDF Olarak İndir" | `dreams.pdfPreparing`, `dreams.pdfDownload` |
| `dreams.tsx` | "Dönemin Sembolleri" | `dreams.periodSymbols` |
| `dreams.tsx` | "Önceki gün" / "Sonraki gün" / "Önceki ay" / "Sonraki ay" | `dreams.previousDay`, `dreams.nextDay`, vb. |
| `calendar.tsx` | "Kozmik Planlayıcı" | `calendar.title` veya `home.planner` |
| `calendar.tsx` | "Doğum Haritanız Gerekli", "Tekrar Dene" | `calendar.errors.*` kullan |
| `calendar.tsx` | "Kozmik pencereler hesaplanıyor...", "Kozmik Analiz" | `calendar.loading`, `calendar.cosmicAnalysis` |
| `CalendarPicker.tsx` | `MONTHS_TR` | i18n ile merkezi ay listesi |
| `accessibilityLabel` | Tüm "Önceki gün", "Rüyayı sil" vb. | `t()` ile i18n kullan |

### Tab Bar / Navigasyon UX
- **6 sekme** (Home, Calendar, Dreams, Compatibility*, Natal, Profile) — Compatibility gizli (`tabBarButton: () => null`)
- Dar ekranlarda (iPhone SE) 5 ikon + etiket sıkışık görünebilir
- Öneri: Swipe tab, "daha fazla" menüsü veya tab gruplaması

### Form / Input UX
- `dreams.tsx` compose: Placeholder metinleri i18n'de var ama bazıları inline kullanılıyor
- `calendar.tsx` empty state: Unicode escape kullanılmış (`\u011F` vb.) — okunabilirlik sorunu

---

## Mevcut Durum Özeti

### Güçlü Yönler ✅
- **Tasarım tokenları**: `tokens.ts` (tipografi, spacing, radius) ve merkezi `colors.ts` mevcut.
- **Atomic bileşenler**: Button, Card, IconButton, Badge, Skeleton, ErrorStateCard, SafeScreen.
- **Erişilebilirlik**: accessibilityLabel, accessibilityRole, hitSlop, maxFontSizeMultiplier kullanımı.
- **A11y token**: minTouchTarget 44px, liveRegion desteği tanımlı.
- **i18n**: Metinler genelde çeviri dosyalarından alınıyor.
- **Hata yönetimi**: ErrorStateCard + retry CTA tüm fetch akışlarında.
- **Özet-detay pattern**: Transit ve Günün Sırrı için "Detayları Göster/Gizle".
- **Slider**: Aktif slide için scale/opacity animasyonu mevcut.

## Hızlı Kazançlar (High impact, Low effort)
1. [x] Kontrast ve metin kontrast testleri — düşük kontrastlı metinleri güncelle (AA uyumu).
2. [x] Touch target standartları — tüm ikon ve butonları en az 44×44 px yap, accessibilityLabel ekle.
3. [x] Skeleton / placeholder yükleyiciler — DailySecret, SkyPulse, SWOT için.
4. [x] Hata durumları — her fetch için kullanıcıya retry CTA ve kısa açıklama göster.
5. [x] `src/constants/colors.ts` üzerinden inline renkleri centralize et.

## Orta Vadeli (Medium effort)
1. [x] Tasarım tokenları (renk, tipografi, spacing, radius) oluşturulması.
2. [x] Atomic UI kütüphanesi: Button, IconButton, Card, Badge, Skeleton, ListItem.
3. [x] Onboarding UX iyileştirmeleri: adım göstergeci (OnboardingProgressBar), yardımcı metin, input mask & validation.
4. [x] Metinler için özet-detay pattern: ana ekranda kısa özet + "Detayları Göster" ile genişletme.
5. [x] Slider görsel odaklama: aktif slide için scale/opacity animasyonu.

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

## 📊 Hızlı Özet Tablosu

| Kategori | Tamamlanan | Bekleyen | Not |
|----------|------------|----------|-----|
| Tasarım tokenları | ✅ | — | tokens.ts, colors.ts |
| Atomic bileşenler | ✅ | EmptyState | Button, Card, Skeleton, ErrorStateCard |
| Erişilebilirlik (temel) | ✅ | accessibilityLabel i18n | hitSlop, minTouchTarget |
| i18n | Kısmen | dreams, calendar hardcoded | ~15+ string taşınacak |
| Home refactor | ✅ | — | TransitCard, WisdomCard, SwotSection, ServiceSlider |
| Slider UX | ✅ | — | Kullanıcı etkileşiminde pause |
| Responsive | — | Tab bar, ServiceSlider | Dar ekran optimizasyonu |
| Offline/Cache | ✅ | — | TanStack Query |

---

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
- [x] **Hata durumları** — Her fetch için retry CTA ve kısa açıklama (kullanıcı deneyimi için kritik)

### 2. Yüksek Öncelik
- [x] **Metin özet-detay pattern** — Ana ekranda kısa özet + "Detayları Göster" (okunabilirlik, CTA belirginliği)
- [x] **Onboarding validation** — Input mask & validation tamamlanması

### 3. Orta Öncelik
- [x] **Slider görsel odaklama** — Aktif slide için scale/opacity animasyonu

### 4. Uzun Vadeli
- [x] Offline-first ve cache stratejisi (TanStack Query, expo ile uyumlu async storage veya alternatif)
- [x] Kapsamlı erişilebilirlik (screen reader, dynamic type)
- [ ] A/B testleri, analitik entegrasyonu
- [ ] E2E testler (Detox / Playwright)

---

## 📐 Responsive & Layout Analizi

| Alan | Durum | Öneri |
|------|-------|-------|
| Tab bar | 5 görünür sekme | Dar ekranda scroll/pagination veya "More" menüsü |
| ServiceSlider | Sabit `SLIDE_WIDTH` | `useWindowDimensions` ile dinamik genişlik |
| Kartlar (Transit, SWOT, Wisdom) | `paddingHorizontal: 20` | Küçük ekranda 14–16px |
| Dream compose | TextInput minHeight: 130 | Keyboard açıkken viewport kaydırma kontrolü |
| Calendar empty | Sabit `paddingHorizontal: 40` | `Dimensions.get('window').width` ile oransal |

---

## 🎨 Mikro Etkileşimler & Animasyonlar

| Bileşen | Mevcut | Öneri |
|---------|--------|-------|
| ServiceSlider | Otomatik kayma, kullanıcı etkileşiminde pause ✅ | 3.2 sn sabit — kullanıcı tercihine açılabilir |
| Moon fazı (SkyPulse) | Glow pulse animasyonu ✅ | — |
| Rüya kartı expand | FadeIn ✅ | Hafif scale + spring |
| Button press | `activeOpacity` | Haptic feedback tutarlılığı (expo-haptics) |
| Tab switch | Anında geçiş | Hafif fade/slide (100–150ms) |

---

## 📝 Boş Durum (Empty State) Tutarlılığı

| Ekran | Emoji | Başlık | CTA | Tutarlı mı? |
|-------|-------|--------|-----|-------------|
| Dreams journal | 🌙 | Henüz rüya kaydın yok | İlk Rüyamı Ekle | ✅ |
| Dreams book (boş ay) | 🌑 | {{ay}} henüz boş | Hikâyeyi Oluştur | ✅ |
| Calendar (no chart) | planet-outline | Doğum Haritanız Gerekli | Doğum Haritası Oluştur | ✅ |
| Compatibility | — | — | Kişi ekle | Kontrol edilmeli |

**Öneri:** `EmptyState` atomic bileşeni — ortak layout (emoji + title + subtitle + CTA)

---

## ⌨️ Klavye & Form UX

| Alan | Durum | Öneri |
|------|-------|-------|
| Dreams compose | `keyboardShouldPersistTaps="handled"` ✅ | — |
| Birth date modal | ScrollView içinde CalendarPicker | `KeyboardAvoidingView` gereksiz (tarih seçici) |
| Birth city | Aramada klavye | Arama sonrası otomatik kapatma |
| Name analysis | Tek sayfa, scroll | — |

---

## 📋 Ekran Bazlı Detaylı Analiz

### Ana Sayfa (home.tsx)
| Alan | Durum | Öneri |
|------|-------|-------|
| Boyut | ~1326 satır | TransitCard, WisdomCard, SwotSection, ServiceSlider bileşenlerine böl |
| Profil blok | LV. 2 (%15) sabit | Gerçek seviye sistemi veya gizlenmeli |
| Slider | 3.2 sn otomatik geçiş | Kullanıcı etkileşiminde duraklat |
| Günün Sırrı | ACTION_MAP, RETRO_CAUTION vb. TR | i18n'e taşı |
| SkyPulse / SWOT | ErrorStateCard + retry | ✅ İyi |

### Onboarding (birth-date.tsx vb.)
| Alan | Durum | Öneri |
|------|-------|-------|
| Modal metinleri | "Tarih secin", "Henuz secilmedi", "Iptal", "Tamam" | i18n key kullan |

### Profil (profile.tsx)
| Alan | Durum | Öneri |
|------|-------|-------|
| dailyYorum | Her zaman 0 | Backend verisi veya UI'dan kaldır |
| LV.2 (%15) | Sabit | Gerçek veri veya kaldır |

### Rüyalar (dreams.tsx)
| Alan | Durum | Öneri |
|------|-------|-------|
| Hardcoded | "Kozmik şifre çözülüyor…", "Sesli Oku", "Durdur" | i18n |
| Section başlıkları | "✨ Fırsatlar", "⚠️ Uyarılar" | i18n |

### Takvim (calendar.tsx)
| Alan | Durum | Öneri |
|------|-------|-------|
| Hata mesajları | Hardcoded TR | i18n calendar.errors.* |
| Başlık | "Kozmik Planlayıcı" inline | t('home.planner') |
| Loading/Error | Türkçe inline | calendar.loading, calendar.errors.* |

### İsim Analizi (name-analysis.tsx)
| Alan | Durum | Öneri |
|------|-------|-------|
| Genel | i18n kullanıyor ✅ | — |
| Haptic | Geri butonunda var ✅ | — |
| ErrorStateCard | Retry CTA var ✅ | — |
| Sayı rozetleri | C.violetBg fallback | Tema tutarlılığı |

### Numeroloji (numerology.tsx)
| Alan | Durum | Öneri |
|------|-------|-------|
| i18n | Var | — |
| Layout | Benzer name-analysis | Ortak "sayı kartı" bileşeni |

---

## 🐛 Tespit Edilen Sorunlar

### 1. Hardcoded / i18n Eksikleri
- birth-date, dreams, profile, calendar — TR stringler i18n'e taşınmalı
- home.tsx: ACTION_MAP, RETRO_CAUTION_KEYS, SECRET_PATTERNS_BY_FOCUS

### 2. UX İyileştirme Alanları
- Ana sayfa slider: Otomatik kayma kullanıcı okurken rahatsız edebilir
- Profil LV.2 / dailyYorum: Anlamsız veri
- Tab bar: 6 sekme dar ekranda sıkışık; swipe tab planlanmış

### 3. Kod Yapısı
- home.tsx 1300+ satır — bileşenlere bölünmeli
- Ortak sabitler ayrı modüllere taşınmalı

### 4. Erişilebilirlik
- maxFontSizeMultiplier tüm uzun metinlerde olmalı
- Renk kontrastı WCAG AA kontrolü

---

## 📌 Yeni Öncelikli İyileştirme Listesi

### Kritik
1. [x] **Dreams & Calendar hardcoded i18n** — MONTHS_TR, "Dinleniyor…", "Kozmik Planlayıcı" vb. tamamlandı
2. [x] Profil LV.2 / dailyYorum — Gizle veya gerçek veriye bağla

### Yüksek
3. [x] Ana sayfa refactor — bileşenlere böl (TransitCard, WisdomCard, SwotSection, ServiceSlider)
4. [x] Ortak sabitler — ACTION_MAP vb. ayrı dosyaya + i18n
5. [x] Slider UX — Otomatik kaymayı kullanıcı etkileşiminde duraklat

### Orta
6. [x] Font/spacing token kullanımı (TYPOGRAPHY, SPACING)


### Uzun Vadeli
8. A/B testleri, E2E testler

---

## 🔤 i18n Eylem Listesi (Öncelik Sırasıyla)

### Kritik — Dreams ekranı
1. `MONTHS_TR` → i18n `calendar.months` veya `dreams.months` (birleştir)
2. "Dinleniyor…", "Ses metne çevriliyor…" → `dreams.listening`, `dreams.transcribing`
3. "ya da yaz", "düzenle" → `dreams.orWrite`, `dreams.edit`
4. Title placeholder: `t('dreams.titlePlaceholder')` kullan (zaten var)
5. "Tekrar eden semboller" → `dreams.recurringSymbols`
6. Dream book: "Hikâye yazılıyor...", "Yapay zeka yazıyor...", "Dönemin Sembolleri"
7. `accessibilityLabel` tüm hardcoded → `t()` ile

### Yüksek — Calendar ekranı
8. "Kozmik Planlayıcı" → `t('home.planner')` veya `calendar.title`
9. Loading/error metinleri → `calendar.loading`, `calendar.errors.*`
10. Unicode escape yerine normal Türkçe karakter

### Orta — Diğer
11. CalendarPicker `MONTHS_TR` → merkezi i18n
12. Tüm `accessibilityLabel` değerlerini i18n `accessibility.*` namespace'ine taşı

---