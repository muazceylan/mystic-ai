# Premium / Trial / Token Purchase

## 1. Genel mimari

Astro Guru monetization akışı üç parçadan oluşur:

1. `notification-service`
   Premium entitlement, RevenueCat webhook işleme, purchase event logu ve Guru ledger/wallet doğrulama kaynağıdır.
2. `mysticai-mobile`
   Paywall, RevenueCat SDK, restore ve entitlement refresh akışını çalıştırır.
3. `mystic-admin`
   Monetization settings, module rules, guru products, purchase events ve user entitlements operasyon yüzeyidir.

Kural: token grant client tarafından yapılmaz. Premium/trial erişimi ve token kredisi yalnızca backend tarafından authoritative kabul edilir.

Faz 5 operasyon runbook'u:

- Ayrıntılı RevenueCat / App Store / Google Play / sandbox adımları için [go-live-sandbox-runbook.md](/Users/solvia/Documents/mystcai/mystic-ai/docs/monetization/go-live-sandbox-runbook.md) dosyasını kullanın.

## 2. Faz 1 foundation özeti

- `SubscriptionEntitlement` ve `PurchaseEvent` veri modelleri eklendi.
- `MonetizationSettings`, `ModuleMonetizationRule`, `GuruProductCatalog` premium alanlarıyla genişletildi.
- `/api/v1/monetization/paywall`
- `/api/v1/me/entitlements`
- Admin monetization settings, module rules ve guru products alanları eklendi.

## 3. Faz 2 webhook + entitlement + ledger özeti

- RevenueCat webhook endpointi: `/api/webhooks/revenuecat`
- Purchase event idempotency: `(provider, eventId)` unique
- Subscription entitlement upsert akışı
- Token purchase ledger grant akışı
- Refund / revocation reversal handling
- Admin Purchase Events ve User Entitlements gerçek backend verisiyle okunur

## 4. Faz 3 mobile RevenueCat entegrasyonu

### Mobile wiring

- Paket: `react-native-purchases`
- Provider: `mysticai-mobile/src/features/monetization/providers/RevenueCatProvider.tsx`
- Service: `mysticai-mobile/src/features/monetization/services/revenueCatService.ts`
- Hooks:
  - `useEntitlements`
  - `usePaywall`
  - `usePurchasePremium`
  - `usePurchaseTokenPack`
  - `useRestorePurchases`

### Çalışma şekli

- SDK yalnızca native iOS/Android buildlerde initialize edilir.
- API key yoksa provider graceful disabled state üretir.
- Auth user id yoksa anonymous purchase başlatılmaz.
- Login sonrası RevenueCat `appUserID` olarak backend user id kullanılır.
- Purchase sonrası client:
  1. `CustomerInfo` alır
  2. `/api/v1/billing/revenuecat/sync` çağırır
  3. `/api/v1/me/entitlements` ve paywall cache’ini yeniler
- Restore sonrası client:
  1. `restorePurchases()` çağırır
  2. `/api/v1/billing/restore` çağırır
  3. entitlement/wallet durumunu yeniler

### Önemli not

Expo Go, RevenueCat / store IAP testleri için yeterli değildir. Development build veya EAS internal build gerekir.

## 5. Faz 4 gate behavior

`FeatureAccessService`, `ModuleMonetizationRule.premiumBehavior` alanını aktif kullanır.

| premiumBehavior | Premium/Trial davranışı |
| --- | --- |
| `NO_CHANGE` | Free kullanıcı akışı korunur |
| `UNLOCK_FREE` | Token harcamadan erişim |
| `DISCOUNT_TOKEN_COST` | `premiumTokenCost` kadar token harcar |
| `AD_FREE_ONLY` | Reklam görmez, token kuralı sürer |
| `TOKEN_REQUIRED_EVEN_PREMIUM` | Normal token cost sürer |

Trial davranışı:

- `trialUnlockEnabled=true` ise `TRIALING` kullanıcı premium kuralına dahil olur
- `trialUnlockEnabled=false` ise `TRIALING` kullanıcı free gibi değerlendirilir

Aktif entitlement kabul edilen durumlar:

- `ACTIVE`
- `TRIALING`
- `GRACE_PERIOD`
- `CANCELLED_ACTIVE` ve `currentPeriodEndAt` gelecekteyse

Aktif sayılmayan durumlar:

- `EXPIRED`
- `REFUNDED`
- `REVOKED`
- `PAUSED`
- `BILLING_RETRY`

## 6. Admin kullanım kılavuzu

### Monetization Settings

- `Premium Enabled`: paywall ve subscription ürünlerini görünür kılar
- `Trial Enabled`: free trial CTA ve eligibility kontrolünü açar
- `Token Purchase Enabled`: token package satın alımını açar
- `RevenueCat Enabled`: mobile purchase CTA’larını aktif eder
- `Hide Ads For Premium Users`: premium kullanıcılar için ad offer yüzeylerini kapatır

### Module Rules

- `premiumBehavior` alanı modül bazında premium etkisini belirler
- `premiumTokenCost` sadece `DISCOUNT_TOKEN_COST` için anlamlıdır
- `trialUnlockEnabled`, trial kullanıcıların premium rule’dan faydalanıp faydalanmayacağını belirler

### Guru Products

- `SUBSCRIPTION` ürünleri premium planlar içindir
- Token ürünleri `CONSUMABLE`, `BUNDLE` veya `PROMOTIONAL` olarak tutulur
- `revenueCatProductId`, RevenueCat offering ile birebir eşleşmelidir
- Token ürünlerini premium entitlement’a bağlamayın

## 7. RevenueCat dashboard manuel setup

### RevenueCat

- iOS app bağla
- Android app bağla
- Entitlement oluştur: `premium`
- Offering oluştur: `default`
- Subscription package eşleşmeleri:
  - `monthly` → `astroguru_premium_monthly`
  - `annual` → `astroguru_premium_yearly`
- Token product eşleşmeleri:
  - `token_50` → `guru_tokens_50`
  - `token_150` → `guru_tokens_150`
  - `token_500` → `guru_tokens_500`
  - `token_1200` → `guru_tokens_1200`
- Token ürünlerini premium entitlement’a bağlama
- Webhook URL:
  - `https://api.astroguru.app/api/webhooks/revenuecat`
- Webhook Authorization header değeri backend'de:
  - `REVENUECAT_WEBHOOK_SECRET`
- Beklenen davranış:
  - invalid secret → `401`
  - duplicate event → `200` + `DUPLICATE`
  - ilk başarılı işleme → `PurchaseEvent` + gerekirse entitlement / wallet güncellemesi

## 8. Apple App Store Connect setup

- Subscription group oluştur
- Monthly ve yearly auto-renewable subscription oluştur
- Free trial / introductory offer tanımla
- Consumable token products oluştur
- Sandbox tester ile test et
- Review notes içine premium / trial / token akışını yaz

## 9. Google Play Console setup

- Subscription product oluştur
- Base plan + offer + free trial tanımla
- One-time consumable token products oluştur
- License tester ile test et
- Purchase acknowledge / consume akışını RevenueCat üzerinden doğrula

## 10. Sandbox test planı

### Repo health gate

Store sandbox testine geçmeden önce aşağıdaki komutlar yeşil olmalıdır:

- `cd mysticai-mobile && pnpm exec tsc --noEmit`
- `cd mystic-admin && pnpm exec eslint src/app/monetization/module-rules/new/page.tsx 'src/app/monetization/module-rules/[id]/page.tsx'`
- `cd mystic-admin && pnpm exec next build --webpack`
- `mvn -pl notification-service test -DskipITs`
- `mvn -pl api-gateway -am compile -DskipTests`

**Faz 4.5 stabilization durumu (2026-05-04):**

- Mobile typecheck: 0 errors (önceden 11 hata vardı — `services/api.ts` ApiRequestConfig generic + `navigation/stackOptions.ts` expo-router type derivation ile çözüldü).
- Admin lint (monetization + routes): `react-hooks/incompatible-library` kalmadı (8 `watch()` çağrısı `useWatch({ control, name })` ile değiştirildi: 4 dosya — `monetization/module-rules/{new,[id]}/page.tsx`, `routes/{new,[id]/edit}/page.tsx`).
- Admin webpack build: SUCCESS.
- Backend (notification-service): 135/135 tests pass, BUILD SUCCESS.
- Hâlâ duran (kapsam dışı, sandbox testi engellemez): `monetization/simulation/page.tsx`'de 4 pre-existing `react-hooks/static-components` hatası (StatusBadge inline component) ve `routes/page.tsx`'de 2 pre-existing `react/no-unescaped-entities`.

Repo health gate yorumu:

- Mobile global typecheck kirmiziysa RevenueCat veya paywall degisiklikleri native build'e tasinmamalidir.
- Admin build kirmiziysa monetization settings / module rules / guru products publish edilmemelidir.
- Backend test veya gateway compile kirmiziysa webhook, entitlement veya gate davranisi production'a alinmamalidir.

### Mobile build

- `.env` içinde:
  - `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
  - `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`
  - `EXPO_PUBLIC_REVENUECAT_ENV=sandbox`
- Development build veya internal build hazırla

### Test senaryoları

1. Login olmuş kullanıcı paywall açar, localized price görünür
2. Trial eligible kullanıcı `Ücretsiz Dene` CTA görür
3. Premium purchase sonrası entitlement snapshot active olur
4. Token pack purchase sonrası immediate optimistic grant yapılmaz
5. Webhook gelince wallet balance artar
6. Restore purchases sonrası entitlement snapshot yenilenir
7. Refund / revoke event sonrası entitlement kapanır
8. `UNLOCK_FREE`, `DISCOUNT_TOKEN_COST`, `AD_FREE_ONLY`, `TOKEN_REQUIRED_EVEN_PREMIUM` modül davranışları doğrulanır

## 11. Production go-live checklist

### Faz 5'e gecmeden hemen once

- Repo health gate komutlari tekrar calistirildi
- Mobile typecheck yesil
- Admin monetization build yesil
- Backend monetization testleri yesil
- RevenueCat dashboard kurulumu tamam ama hala sandbox ortaminda
- Test edilecek package/product id listesi admin ekranindaki kayitlarla tekrar karsilastirildi

- RevenueCat iOS ve Android API key’leri production secret store’da tanımlı
- `REVENUECAT_WEBHOOK_SECRET` production’da set
- RevenueCat offering `default` published
- Apple subscription ve consumable ürünleri approved
- Google Play subscription ve one-time products active
- Premium/trial/token ürün id’leri admin guru products ile eşleşiyor
- `MonetizationSettings` içinde `RevenueCat Enabled`, `Premium Enabled`, `Token Purchase Enabled` publish edildi
- Sandbox yerine production RevenueCat environment kullanılıyor
- EAS/internal build yerine release candidate build test edildi
- App Store sandbox tester ve Google license tester smoke test geçti

## 12. Troubleshooting

### Paywall açılıyor ama store fiyatı yok

- RevenueCat offering `default` publish edilmiş mi kontrol et
- `revenueCatProductId` ile store product id eşleşmesini doğrula
- Native build kullanıldığını doğrula

### Purchase başarılı ama token hemen artmadı

- Beklenen davranıştır
- Token grant webhook ile doğrulanınca ledger’a işlenir
- UI “satın alma alındı, hesap güncelleniyor” mesajı göstermelidir

### Premium aktif görünmüyor

- RevenueCat webhook logunu ve `purchase_event` kayıtlarını kontrol et
- `SubscriptionEntitlement.status` değerini doğrula
- `currentPeriodEndAt` geçmişteyse `CANCELLED_ACTIVE` bile active sayılmaz

### Restore çalışmıyor

- Cihaz store hesabının aynı tester hesabı olduğundan emin ol
- RevenueCat app user id ile backend user id mapping’ini doğrula
- Native build kullanıldığını tekrar kontrol et

## 13. Faz 5 operasyon özeti

- Dashboard/store wiring ve sandbox adımlarını [go-live-sandbox-runbook.md](/Users/solvia/Documents/mystcai/mystic-ai/docs/monetization/go-live-sandbox-runbook.md) üzerinden yürütün.
- Faz 5 sıralaması:
  1. Runbook checklist'lerini tamamla
  2. RevenueCat dashboard bağlantılarını doğrula
  3. App Store Connect ürünlerini aç
  4. Google Play ürünlerini aç
  5. iOS sandbox premium + restore testi yap
  6. Android internal test + token purchase testi yap
  7. Duplicate webhook / ledger idempotency kontrolünü yap
  8. Son production release gate kararını ver
