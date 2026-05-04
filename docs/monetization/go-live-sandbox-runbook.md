# Astro Guru Monetization Faz 5 Runbook

Bu dokumanin amaci kod degisikligi yapmak degil, Faz 5 sandbox ve go-live hazirlik adimlarini operasyonel olarak siralamaktir.

Ana referans:

- Mimari ve Faz 1-4 ozeti icin [premium-trial-token-purchase.md](/Users/solvia/Documents/mystcai/mystic-ai/docs/monetization/premium-trial-token-purchase.md)

## 1. RevenueCat checklist

### Apps

- iOS app RevenueCat'e baglandi.
- Android app RevenueCat'e baglandi.
- iOS Bundle ID, App Store Connect kaydiyla birebir eslesiyor.
- Android Package Name, Google Play kaydiyla birebir eslesiyor.
- App Store Connect credentials RevenueCat tarafinda baglandi.
- Google Play service credentials RevenueCat tarafinda baglandi.

### Entitlement

- Entitlement: `premium`

### Offering

- Offering: `default`

### Subscription packages

| RevenueCat package | Store product id |
| --- | --- |
| `monthly` | `astroguru_premium_monthly` |
| `annual` | `astroguru_premium_yearly` |

### Token products

Bu urunler RevenueCat'te urun olarak tanimli olmali ama `premium` entitlement'ina baglanmamali.

| RevenueCat key | Store product id |
| --- | --- |
| `token_50` | `guru_tokens_50` |
| `token_150` | `guru_tokens_150` |
| `token_500` | `guru_tokens_500` |
| `token_1200` | `guru_tokens_1200` |

### Webhook

- URL: `https://api.astroguru.app/api/webhooks/revenuecat`
- RevenueCat dashboard Authorization header degeri backend secret ile ayni olmali.
- Backend env:
  - `REVENUECAT_WEBHOOK_SECRET=<same-header-value>`
- Prod ortamda `REVENUECAT_WEBHOOK_ALLOW_EMPTY_SECRET=false` kalmali.

### RevenueCat acceptance criteria

- Ilk webhook geldiginde backend `PurchaseEvent` olusturur.
- Subscription event geldiginde ilgili `SubscriptionEntitlement` satiri olusur veya guncellenir.
- Token purchase event geldiginde `GuruLedger` ve wallet artisi tek sefer olur.
- Invalid secret ile webhook `401` doner ve payload persist edilmez.
- Duplicate webhook tekrar token basmaz veya entitlement'i ikinci kez degistirmez.

## 2. App Store Connect checklist

### Subscription group

- Grup adi: `Astro Guru Premium`

### Auto-renewable subscriptions

- `astroguru_premium_monthly`
- `astroguru_premium_yearly`

Her subscription icin:

- Display name tanimli
- Description tanimli
- Price tanimli
- TR localization tanimli
- EN localization tanimli
- Review screenshot yuklu
- Subscription duration dogru
- Subscription group level dogru
- Free trial veya introductory offer tanimli

Trial onerisi:

- `3` gun veya `7` gun free trial

### Consumable IAP products

- `guru_tokens_50`
- `guru_tokens_150`
- `guru_tokens_500`
- `guru_tokens_1200`

Her token urunu icin:

- Consumable type secildi
- Price tanimli
- Display name tanimli
- Description tanimli
- TR localization tanimli
- EN localization tanimli
- Review screenshot yuklu

### Review notes

App Review notu:

`Astro Guru uses auto-renewable subscriptions for Premium access and consumable in-app purchases for Guru Tokens. Users can start a free trial from the Premium screen. Guru Tokens are used for selected premium AI-powered astrology features. Purchases are validated through RevenueCat and reflected in the user wallet after server-side webhook processing.`

## 3. Google Play Console checklist

### Subscription product

- Subscription product: `astroguru_premium`

### Base plans

| Base plan | Billing id |
| --- | --- |
| Monthly | `astroguru_premium_monthly` |
| Yearly | `astroguru_premium_yearly` |

### Offers

- Free trial offer tanimli
- Eligibility: new subscribers
- Region ve pricing kontrol edildi

### One-time consumable products

- `guru_tokens_50`
- `guru_tokens_150`
- `guru_tokens_500`
- `guru_tokens_1200`

Her product icin:

- Active status
- Price
- TR localization
- EN localization
- RevenueCat urun eslesmesi
- Backend tarafinda consumable davranis dogrulamasi

### Test setup

- Internal testing track olusturuldu
- Internal build upload edildi
- License tester hesaplari tanimli
- Tester opt-in link paylasildi
- Package name kontrol edildi
- Play Billing urun id'leri RevenueCat ile birebir eslesiyor

## 4. Backend, mobile ve admin smoke checklist

### Production env

- Backend:
  - `REVENUECAT_WEBHOOK_SECRET=`
- Mobile sandbox build:
  - `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=`
  - `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=`
  - `EXPO_PUBLIC_REVENUECAT_ENV=sandbox`
- Mobile production build:
  - `EXPO_PUBLIC_REVENUECAT_ENV=production`

### Backend smoke commands

Anonymous paywall:

```bash
curl -I https://api.astroguru.app/api/v1/monetization/paywall
curl -sS https://api.astroguru.app/api/v1/monetization/paywall | jq
```

Authenticated entitlement snapshot:

```bash
curl -sS https://api.astroguru.app/api/v1/me/entitlements \
  -H "Authorization: Bearer <USER_JWT>" | jq
```

Authenticated RevenueCat sync:

```bash
curl -sS -X POST https://api.astroguru.app/api/v1/billing/revenuecat/sync \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json" \
  --data '{}' | jq
```

Authenticated restore:

```bash
curl -sS -X POST https://api.astroguru.app/api/v1/billing/restore \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json" \
  --data '{}' | jq
```

Not:

- Gateway uzerinden gercek kullanici JWT ile gidildiginde `X-User-Id` header'i manuel verilmemelidir.
- `curl -I` eger CDN/proxy tarafinda kisitliysa `curl -sS -D - ... -o /dev/null` fallback olarak kullanilabilir.

### Admin ekranlari

- `/monetization/settings`
- `/monetization/guru-products`
- `/monetization/module-rules`
- `/monetization/purchase-events`
- `/monetization/user-entitlements`

### Log / ekran kontrol sirasi

Premium veya token purchase roundtrip sirasinda:

1. Mobile'da `/premium` veya token store acilir.
2. RevenueCat dashboard customer ve event gorulur.
3. Backend loglarinda webhook receive ve process gorulur.
4. Admin `Purchase Events` ekraninda event satiri gorulur.
5. Admin `User Entitlements` ekraninda kullanici aranir.
6. Subscription ise entitlement status kontrol edilir.
7. Consumable ise wallet balance ve ledger etkisi kontrol edilir.

### Backend log ipuclari

Beklenen log sinyalleri:

- `RevenueCat webhook duplicate: ...` duplicate testte
- `Guru granted: ... type=PURCHASE_COMPLETED ...` ilk token grant'te
- `Purchase replay returned existing ledger without reapplying ...` ayni idempotency ile replay durumunda

## 5. iOS sandbox test runbook

1. iOS development veya internal build uret.
2. `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` sandbox key ile ayarli oldugunu dogrula.
3. App Store Connect sandbox tester hazirla.
4. Test cihazinda sandbox tester hesabiyla oturum ac.
5. Astro Guru icinde uygulama login'ini yap.
6. `/premium` ekranini ac.
7. Monthly trial veya monthly subscription satin alimini baslat.
8. RevenueCat dashboard'da customer ve event'i dogrula.
9. Admin `Purchase Events` ekraninda event'i dogrula.
10. Admin `User Entitlements` ekraninda kullaniciyi ara.
11. `premium` entitlement status'unun `TRIALING` veya `ACTIVE` oldugunu dogrula.
12. Mobile'da premium active state gorundugunu dogrula.
13. `Restore purchases` calistir.
14. Uygulamayi sil / yukle / login / restore senaryosunu test et.
15. Subscription cancellation veya expiration sandbox hizlandirilmis davranisini gozlemle.
16. Entitlement `EXPIRED` veya `REVOKED` oldugunda premium gate'in kapandigini dogrula.

### iOS basari kriteri

- Mobile `premiumActive=true` gorur.
- Backend entitlement olusturur veya gunceller.
- Admin event ve entitlement ekranlari dogru veri gosterir.
- Restore purchases calisir.

## 6. Android sandbox test runbook

1. Android internal test build uret.
2. `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` sandbox veya uygun test key ile ayarli oldugunu dogrula.
3. Google Play Console internal testing track'e build yukle.
4. License tester hesaplarinin opt-in yaptigini dogrula.
5. Astro Guru icinde login ol.
6. `/premium` ekranini ac.
7. Monthly veya yearly subscription purchase test et.
8. RevenueCat dashboard event'ini dogrula.
9. Admin `Purchase Events` ekranini kontrol et.
10. Admin `User Entitlements` ekraninda premium active state gor.
11. Token store ac.
12. `guru_tokens_50` veya `guru_tokens_150` satin al.
13. RevenueCat event'ini dogrula.
14. Backend `Purchase Events` icinde token event'ini gor.
15. `GuruWallet` balance artisinin webhook sonrasi geldigini dogrula.
16. Ayni webhook duplicate yeniden oynatildiginda balance'in tekrar artmadigini dogrula.
17. Refund veya revocation senaryosunda entitlement ve token state'in guvenli guncellendigini kontrol et.

### Android basari kriteri

- Token purchase sonrasi wallet backend kaynakli artar.
- Client optimistic token basmaz.
- Duplicate event ikinci kez token basmaz.
- Refund ve revocation guvenli islenir.

## 7. Duplicate webhook testi

Webhook payload ornegi bu dokumana eklenmez. Testte yakalanmis ayni sandbox event veya RevenueCat dashboard retry aksiyonu kullanilir.

### Beklenen davranis

- Ilk event: `PROCESSED`
- Ayni event tekrar: `DUPLICATE`
- `GuruLedger` ikinci kez credit yazmaz
- `GuruWallet` balance ikinci kez artmaz

### Manuel kontrol noktasi

- Admin `Purchase Events` listesi
- Ilgili kullanicinin wallet balance'i
- Ledger tablosu veya admin wallet gorunumu
- Backend duplicate log satiri

## 8. Refund / revocation testi

Subscription refund veya revocation sirasinda:

- `Purchase Events` kaydi olusur
- `SubscriptionEntitlement.status` guvenli sekilde `REFUNDED` veya `REVOKED` olur
- Premium gate kapanir

Consumable refund veya revocation sirasinda:

- Reversal tek sefer uygulanir
- Negative balance guard beklenmedik ikinci dususu engeller
- Duplicate reversal ikinci kez calismaz

## 9. Go-live gate tablosu

Asagidaki tablo mevcut repo ve dokuman durumunun operasyon snapshot'idir. Manuel dashboard/store testleri bu seans icinde calistirilmadigi icin ilgili satirlar gate'i gecmis sayilmaz.

| Alan | Durum | Not |
| --- | --- | --- |
| Backend tests | PASS | `mvn -pl notification-service test -DskipITs` onceki stabilizasyon turunda yesil |
| Admin build | PASS | `pnpm exec next build --webpack` yesil |
| Mobile typecheck | PASS | `pnpm exec tsc --noEmit` yesil |
| RevenueCat iOS app | BLOCKED | Dashboard baglantisi manuel dogrulanmadi |
| RevenueCat Android app | BLOCKED | Dashboard baglantisi manuel dogrulanmadi |
| Webhook secret | BLOCKED | Env key destegi var, production secret seti bu seans icinde dogrulanmadi |
| App Store subscriptions | BLOCKED | Manuel urun acilisi ve review setup bekleniyor |
| App Store token products | BLOCKED | Manuel urun acilisi bekleniyor |
| Google Play subscriptions | BLOCKED | Base plan ve offer kurulumu bekleniyor |
| Google Play token products | BLOCKED | One-time product kurulumu bekleniyor |
| iOS sandbox premium | FAIL | Henuz calistirilmadi |
| iOS sandbox restore | FAIL | Henuz calistirilmadi |
| Android sandbox premium | FAIL | Henuz calistirilmadi |
| Android sandbox token purchase | FAIL | Henuz calistirilmadi |
| Duplicate webhook idempotency | FAIL | Kod hazir, manuel resend testi bekleniyor |
| Refund/revocation | FAIL | Kod hazir, sandbox dogrulamasi bekleniyor |

## 10. Sonraki manuel adimlar

1. RevenueCat dashboard apps, entitlement, offering ve package mapping'i tamamla.
2. App Store Connect subscription ve consumable urunlerini olustur.
3. Google Play Console subscription, base plan, offer ve one-time products kurulumunu tamamla.
4. iOS sandbox premium + restore testi yap.
5. Android internal test + token purchase testi yap.
6. Duplicate webhook ve refund/revocation senaryolarini canli sandbox ortaminda dogrula.
7. Go-live gate tablosunu yeniden guncelle.
