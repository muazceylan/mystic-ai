# Mystic AI — Mobile App

React Native + Expo tabanlı mobil istemci. iOS ve Android'i destekler.

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Framework | React Native 0.81 · Expo SDK 54 |
| Routing | Expo Router (file-based) |
| Dil | TypeScript |
| State | Zustand + AsyncStorage persistence |
| Server State | TanStack Query (React Query) |
| Stil | Custom StyleSheet + theme/token sistemi · NativeWind |
| i18n | i18next + react-i18next |
| Analytics | Amplitude HTTP API |

## Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Ortam dosyasını hazırla
cp .env.example .env

# Expo Metro bundler'ı başlat
npm run start

# iOS
npm run ios

# Android
npm run android
```

## Ortam Değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `EXPO_PUBLIC_APP_ENV` | `dev` / `stage` / `prod` |
| `EXPO_PUBLIC_API_BASE_URL_DEV_OVERRIDE` | Opsiyonel — manuel API URL (`http://<host>:8080`) |

> Android emülatörde `localhost` yerine `10.0.2.2` kullanılır. `env.ts` bunu otomatik çözer.

## Proje Yapısı

```
src/
├── app/                    # Expo Router route dosyaları
│   ├── _layout.tsx         # Root layout (auth check, bootstrap)
│   ├── (auth)/             # Login, register, onboarding
│   └── (tabs)/             # Tab bar ekranları
├── components/
│   ├── ui/                 # Paylaşılan UI parçaları (Card, Badge, Chip, BottomSheet…)
│   └── <feature>/          # Özelliğe özgü componentler
├── features/
│   ├── tutorial/           # Tutorial registry, analytics, engine
│   └── monetization/       # Monetization — reklam, Guru token, satın alma
├── services/               # API istemcileri (api.ts wrapper üzerinden)
├── store/                  # Zustand store'lar
├── spiritual/              # Dua / Esma bounded context
├── theme/                  # Renk paleti, typography, spacing token'ları
├── config/
│   └── env.ts              # Env okuma ve base URL seçimi
├── i18n/                   # Lokalizasyon (TR/EN)
└── utils/                  # Yardımcı fonksiyonlar
```

## Temel Özellikler

- Natal chart, synastry, günlük transit, cosmic planner
- Rüya günlüğü (sesli kayıt + AI yorumu)
- Numeroloji analizi
- Dua, Esmaül Hüsna sayacı, nefes egzersizleri
- Kahve/el falı görsel analizi (Vision)
- Akıllı push + in-app bildirimler
- Dinamik CMS (home sections, keşif kartları, banner'lar)

## Monetization

`src/features/monetization/` altında tam bir monetization altyapısı mevcuttur.

### Guru Token Sistemi

Kullanıcılar **Guru** adlı sanal token biriktirerek premium içeriklerin kilidini açabilir.
Token kaynakları: reklam izleme, uygulama içi satın alma.

```
src/features/monetization/
├── types.ts                 # MonetizationConfig, ModuleRule, GuruProduct, EligibilityResult…
├── index.ts                 # Public API
├── api/
│   └── monetization.service.ts   # fetchMonetizationConfig, checkEligibility, fetchWallet…
├── store/
│   ├── useMonetizationStore.ts   # Config + exposure state
│   └── useGuruWalletStore.ts     # Wallet balance + ledger
├── hooks/
│   ├── useModuleMonetization.ts  # Modül bazlı eligibility kontrolü
│   ├── useRewardedUnlock.ts      # Reklam izleyerek kilit açma
│   └── useGuruUnlock.ts          # Guru token ile kilit açma
├── providers/
│   ├── AdMobRewardedProvider.ts  # Google AdMob rewarded reklam
│   ├── admobInit.ts              # AdMob başlatma
│   ├── admobUnitIds.ts           # Platform + ortam bazlı reklam birimleri
│   └── initProvider.ts           # Provider seçimi (admob / mock)
├── components/
│   ├── GuruBalanceBadge.tsx      # Token bakiyesi göstergesi
│   ├── AdOfferCard.tsx           # Reklam teklif kartı
│   ├── GuruUnlockModal.tsx       # Guru ile kilit açma modal'ı
│   ├── PurchaseCatalogSheet.tsx  # Satın alma ürün kataloğu
│   └── MonetizationQuickBar.tsx  # Hızlı erişim çubuğu
└── analytics/
    └── monetizationAnalytics.ts  # Monetization event'leri
```

### Çalışma Mantığı

1. Uygulama açılışında `fetchMonetizationConfig` ile sunucu konfigürasyonu çekilir.
2. Her modül için `ModuleRule` tanımları: reklam stratejisi, Guru maliyeti, önizleme derinliği.
3. `useModuleMonetization(moduleKey)` hook'u, kullanıcının ilgili içeriğe erişip erişemeyeceğini (`EligibilityResult`) döner.
4. Erişim yoksa `AdOfferCard` veya `GuruUnlockModal` gösterilir.
5. `useRewardedUnlock` → AdMob rewarded reklam → başarıyla tamamlanınca Guru token kazanılır.
6. `useGuruUnlock` → wallet'tan token düşer → içerik kilidi açılır.

### Konfigürasyon Alanları (`MonetizationConfig`)

| Alan | Açıklama |
|------|----------|
| `enabled` | Monetizasyon açık/kapalı |
| `adsEnabled` | Global reklam flag |
| `guruEnabled` | Guru token sistemi flag |
| `globalDailyAdCap` | Günlük maksimum reklam gösterim sayısı |
| `moduleRules[]` | Modül bazlı reklam/Guru kuralları |
| `products[]` | Satın alınabilir Guru paketleri |

### Reklam Sağlayıcı

Şu an aktif sağlayıcı: **Google AdMob** (rewarded video)

Platform bazlı reklam birimleri `admobUnitIds.ts` içinde tanımlıdır. Dev ortamında test reklam birimleri kullanılır.

## Navigasyon Kuralları

- Tüm tab bar ekranları `app/(tabs)/` altındadır.
- Alt sayfalar için `app/(tabs)/<feature>/` klasör yapısı + `_layout.tsx` (Stack) kullanılır.
- Tüm ekranlar `SafeScreen` wrapper ile başlar (safe area + web max-width: 920px).

## API Katmanı

```
src/services/api.ts   ← Tüm HTTP çağrılarının merkezi axios instance'ı
```

Ekranda doğrudan `axios` oluşturulmaz; her feature kendi service dosyasını bu instance üzerinden kullanır.

## Test

Otomatik UI test suite mevcut değil. Kritik path'ler için manual smoke testi yapılır:

- Signup → login → email doğrulama
- Natal chart oluşturma
- Home/oracle yüklenmesi
- Rüya kaydetme + yorum
- Numeroloji hesaplama
- Bildirim deep link açılışı

## Platform Desteği

| Platform | Durum |
|----------|-------|
| iOS | Aktif |
| Android | Aktif |
| Web | Kısmi (Expo Web) |
