# Astro Guru Store Launch Readiness

Date: 2026-04-23
Scope: First submission readiness for Apple App Store and Google Play
App: Astro Guru
Package / Bundle ID: `com.mysticai.app`

## 1. Executive Summary

Astro Guru mobile codebase is close to first-store-submission shape, but it was not fully production-ready for release engineering and compliance on arrival. The main gaps were:

- native config ambiguity for production builds
- unnecessary Android and iOS permission declarations
- weak in-app visibility for privacy, terms, support, and account deletion
- privacy / public policy text that did not fully match the current auth, analytics, notifications, and rewarded-ad flows

This pass hardens the Expo/native release config, prunes risky permissions, makes legal/support/delete-account actions visible in Profile and Help, and aligns the public web policy surfaces with the current product reality.

## 2. Blocking Issues

The following items still require human, backend, or store-console work before final production submission:

1. Production secrets and environment values must be confirmed.
   Required examples:
   - `EXPO_PUBLIC_API_BASE_URL_PROD`
   - `EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_UNIT_ID`
   - `EXPO_PUBLIC_ADMOB_IOS_REWARDED_UNIT_ID`
   - production Google OAuth client IDs
   - any analytics keys enabled in production

2. Store signing and distribution credentials are not verifiable from repo code alone.
   Required:
   - Apple distribution certificate / provisioning
   - App Store Connect app record
   - Play App Signing / upload key
   - EAS credential ownership check

3. Google Play account deletion URL still needs a stronger public destination.
   Current state:
   - in-app deletion exists
   - public contact page explains fallback deletion by email
   Recommended final state:
   - a dedicated public deletion page or self-serve deletion status page
   - optionally a backend-authenticated web deletion endpoint for users who cannot access the app

4. Privacy Nutrition Label and Play Data Safety forms still need final manual submission in store consoles.
   This document includes draft matrices, but the final declaration must be completed by the release owner after validating live SDK behavior and backend retention policies.

## 3. Warning / Non-Blocking Issues

1. Rewarded ads are present and should keep `child-directed` and `under-age-of-consent` treatment disabled unless product/legal changes.

2. The app should not be submitted to Apple Kids Category or Google Play Families.
   Reasons:
   - astrology / spiritual content
   - rewarded ads
   - user-generated dream content

3. Token purchase surfaces already exist in code but are not currently active store flows.
   Do not enable product catalog purchasing in production until real IAP / Play Billing is implemented end to end.

4. ATT-style tracking permission flow is not implemented.
   Do not declare cross-app tracking in App Store Connect unless the implementation is added later.

5. Review team access is acceptable via guest quick start for broad exploration, but a dedicated registered review account is still recommended for testing authenticated and deletion-related flows.

## 4. File-by-File Changes

### Mobile release config

- `mysticai-mobile/app.json`
  - Added explicit `ios.buildNumber` and `android.versionCode`
  - Added `ios.usesNonExemptEncryption=false`
  - Declared only the Android permissions currently needed by the app
  - Explicitly pinned Android `compileSdkVersion=35`, `targetSdkVersion=35`, `minSdkVersion=24`
  - Explicitly pinned iOS deployment target `15.1`
  - Disabled media location access because the app does not need photo geolocation metadata

- `mysticai-mobile/app.config.ts`
  - Updated AdMob tracking description copy to a more review-safe message aligned with rewarded-video usage

- `mysticai-mobile/android/app/src/main/AndroidManifest.xml`
  - Removed unused or risky permissions:
    - `ACCESS_MEDIA_LOCATION`
    - `READ_EXTERNAL_STORAGE`
    - `READ_MEDIA_AUDIO`
    - `READ_MEDIA_VIDEO`
    - `SYSTEM_ALERT_WINDOW`
    - `WRITE_EXTERNAL_STORAGE`
  - Removed `requestLegacyExternalStorage`

- `mysticai-mobile/ios/AstroGuru/Info.plist`
  - Aligned minimum OS with deployment target
  - Removed unused camera and motion usage strings
  - Reworded microphone and tracking copy for store-facing clarity

- `mysticai-mobile/ios/AstroGuru/AstroGuru.entitlements`
  - Switched `aps-environment` from `development` to `production` for release readiness

### In-app compliance visibility

- `mysticai-mobile/src/app/(tabs)/profile.tsx`
  - Added a visible `Legal and Support` section
  - Added direct profile actions for:
    - Privacy Policy
    - Terms of Use
    - Contact Support
    - Delete Account
  - Reused the existing delete-account modal rather than creating a parallel flow

- `mysticai-mobile/src/app/help.tsx`
  - Added quick links to Privacy Policy and Terms of Use
  - Added an explicit delete-account guidance card

### In-app policy text

- `mysticai-mobile/src/i18n/en.json`
- `mysticai-mobile/src/i18n/tr.json`
  - Updated privacy copy to reflect:
    - auth providers
    - profile data
    - dream content
    - push preferences
    - rewarded-ad / wallet activity
    - analytics usage
  - Updated delete-data FAQ to point to in-app deletion first
  - Updated last-modified dates
  - Added strings for the new Profile legal/support section and Help quick links

### Public web policy surfaces

- `mystic-web/src/app/en/privacy/page.tsx`
- `mystic-web/src/app/(tr)/gizlilik/page.tsx`
  - Expanded data categories and third-party processing disclosures
  - Added in-app deletion path and sensitive-topic disclaimer

- `mystic-web/src/app/en/terms/page.tsx`
- `mystic-web/src/app/(tr)/kullanim-sartlari/page.tsx`
  - Added age / content disclaimer section
  - Updated timestamps

- `mystic-web/src/app/en/contact/page.tsx`
- `mystic-web/src/app/(tr)/iletisim/page.tsx`
  - Added clearer review/support framing
  - Clarified in-app deletion path and email fallback

## 5. Store Metadata Checklist

Prepare the following before upload:

- App name: Astro Guru
- Subtitle / short description with no medical or financial implication
- Full description that states:
  - astrology / numerology / spiritual guidance content is informational and entertainment oriented
  - rewarded video may be used to earn in-app tokens
  - no direct in-app sale of digital goods is currently active
- Privacy Policy URL
- Terms URL
- Support URL
- Account deletion URL or deletion help URL
- Review notes describing:
  - guest quick start path
  - registered account path
  - delete account path
  - rewarded ads behavior
- Keywords / tags that avoid child-targeting language
- Screenshots without placeholder premium purchase language if monetization is still disabled
- Category selection that avoids Kids / Family positioning

## 6. Apple Submission Checklist

1. Confirm `com.mysticai.app` exists in App Store Connect.
2. Confirm Sign in with Apple capability is enabled on the app record.
3. Confirm bundle versioning:
   - marketing version `1.0.0`
   - build number increments per upload
4. Verify push notifications in a release/TestFlight build.
5. Verify Google login, manual signup/login, and Apple login in release build.
6. Verify account deletion from Profile in release build.
7. Verify privacy and terms screens open from:
   - welcome
   - profile
   - help
8. Confirm App Privacy answers from the matrix below.
9. Confirm export compliance answer is consistent with `usesNonExemptEncryption=false`.
10. Add review notes:
    - “Core features can be explored using Quick Start as guest.”
    - include a registered review account if any authenticated-only feature must be checked
11. Upload through TestFlight first and complete a smoke pass before App Review submission.

## 7. Google Play Submission Checklist

1. Confirm package `com.mysticai.app` exists in Play Console.
2. Confirm Play App Signing and upload key ownership.
3. Upload `aab` to Internal Testing first.
4. Confirm target SDK satisfies current Play requirement.
5. Confirm Data Safety answers from the matrix below.
6. Confirm account deletion declaration:
   - in-app deletion available
   - public deletion help URL prepared
7. Confirm Ads declaration:
   - rewarded ads are present
   - not child-directed
8. Confirm Sign in with Apple is not required on Android listing, but Google login and manual signup work.
9. Add tester instructions for:
   - Quick Start
   - account linking
   - delete account
   - rewarded token flow
10. Run Internal Testing smoke before Closed / Production rollout.

## 8. Privacy / Data Safety Draft Matrix

### Apple Privacy Nutrition Label Draft

| Data Type | Collected | Linked to User | Used for Tracking | Purpose |
| --- | --- | --- | --- | --- |
| Email Address | Yes | Yes | No | Account creation, login, support |
| User ID / Account ID | Yes | Yes | No | Authentication, account state |
| Name / Profile Info | Yes | Yes | No | Profile display, personalization |
| Birth Date / Time / Place | Yes | Yes | No | Core astrology / numerology features |
| Gender / Marital Status / Language | Yes | Yes | No | Personalization |
| Profile Photo | Yes | Yes | No | User profile |
| User Content (dream text, optional voice-derived content) | Yes | Yes | No | Dream features |
| Diagnostics / Usage Data | Yes | Possibly | No | Analytics, performance, fraud reduction |
| Push Token / Notification Preferences | Yes | Yes | No | Notifications |
| Rewarded Ad Events / Wallet / Token Ledger | Yes | Yes | No | Reward fulfillment, abuse prevention |

### Google Play Data Safety Draft

| Data Category | Collected | Shared | Required for App | Purpose |
| --- | --- | --- | --- | --- |
| Personal info: email | Yes | Limited processor access | Yes | Authentication, support |
| Personal info: name | Yes | No direct third-party sale/share | No | Profile |
| Financial info | No direct real-money billing in app now | No | No | N/A for current release |
| App activity | Yes | Processor-level analytics / ads only | No | Analytics, rewarded ad measurement |
| Messages / user content | Yes | Processor-level AI or infrastructure as needed | Feature-dependent | Dream interpretation |
| Photos | Yes, optional | No sale/share | No | Profile avatar / saved content flows |
| Audio | Yes, optional | No sale/share | No | Dream voice recording |
| Device or other IDs | Yes | SDK processors as needed | No | Notifications, analytics, rewarded ads |

### Missing Privacy Policy Topics To Keep Improving

- retention windows per data class
- exact processor list and roles
- user data export procedure
- ad personalization stance by region
- moderation / abuse review handling for user-generated content

### Account Deletion Web Link Requirement

Recommended final requirement set:

- Public route such as `/delete-account`
- Clear statement that in-app deletion exists
- Fallback form or email path for inaccessible accounts
- Optional authenticated self-serve deletion request tied to user session
- Confirmation / SLA language for manual requests

## 9. Review Account Checklist

Recommended setup:

- 1 guest review path using Quick Start
- 1 registered email/password account
- 1 Google-linked account
- 1 Apple-linked account for iOS review if feasible

Reviewer note should mention:

- Quick Start unlocks broad product exploration without signup
- Profile contains visible Privacy Policy, Terms of Use, Support, and Delete Account actions
- Account deletion path:
  - Profile → Permanently Delete Account
- Rewarded ads are optional and only grant in-app tokens, not cash value

## 10. Future Monetization Note

IAP / Play Billing is intentionally not added in this pass because the app currently does not sell digital goods in store channels.

When token sales or premium unlocks are introduced later, review these files first:

- `mysticai-mobile/src/features/monetization/components/PurchaseCatalogSheet.tsx`
- `mysticai-mobile/src/features/monetization/api/monetization.service.ts`
- `mysticai-mobile/src/features/monetization/store/useMonetizationStore.ts`
- `mysticai-mobile/src/features/monetization/store/useGuruWalletStore.ts`
- `mysticai-mobile/src/features/monetization/types.ts`
- `mystic-admin/src/lib/monetizationEnvironmentRules.ts`
- `mystic-admin/src/lib/api/rewards.ts`

Required future work before activating paid digital goods:

- Apple IAP implementation
- Google Play Billing implementation
- store product metadata and localized pricing
- receipt / purchase validation backend
- restore purchases flow
- purchase error / refund handling
- App Store / Play screenshots and copy that describe paid access correctly
- updated privacy and terms text for paid digital goods
