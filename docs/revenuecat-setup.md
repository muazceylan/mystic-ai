# RevenueCat Setup

Astro Guru mobile app reads RevenueCat public SDK keys from Expo public env variables. The RevenueCat dashboard structure is the source of truth:

- Premium entitlement identifier: `Astro Guru Pro`
- Premium offering: `default`
- Premium packages: `$rc_monthly`, `$rc_annual`
- Guru token offering: `guru_tokens`
- Guru token packages/products: `guru_tokens_50`, `guru_tokens_150`, `guru_tokens_500`, `guru_tokens_1200`

## EAS env

```bash
# Production Android
eas env:create \
  --environment production \
  --visibility plaintext \
  --name EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY \
  --value "RevenueCat Android public SDK key"

eas env:create \
  --environment production \
  --visibility plaintext \
  --name EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID \
  --value "Astro Guru Pro"

# Preview / Internal test
eas env:create \
  --environment preview \
  --visibility plaintext \
  --name EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY \
  --value "RevenueCat Android public SDK key"

eas env:create \
  --environment preview \
  --visibility plaintext \
  --name EXPO_PUBLIC_REVENUECAT_TEST_API_KEY \
  --value "RevenueCat Test Store public key"

eas env:create \
  --environment preview \
  --visibility plaintext \
  --name EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID \
  --value "Astro Guru Pro"
```

Add `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` in the same way before iOS builds.

## Safety notes

- Do not put RevenueCat secret keys in the mobile app.
- Keys starting with `sk_` must not be added to Expo public env.
- Mobile builds should use only `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`, `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`, `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY`, and `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID`.
- After changing EAS env values, create a new EAS build. OTA updates may not fix native/runtime env mismatches.
- For a clean Android release build:

```bash
eas build --platform android --profile production --clear-cache
```

For preview/internal validation:

```bash
eas build --platform android --profile preview --clear-cache
```

## Verification

```bash
eas env:list --environment production | grep -i revenue
eas env:list --environment preview | grep -i revenue
```

The mobile app never logs API key values. Debug output is limited to booleans such as `hasAndroidKey`, `hasIosKey`, `hasTestKey`, selected source, platform, build profile, entitlement id, and offering ids.
