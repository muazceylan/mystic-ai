# Firebase Analytics (GA4) Integration

## Architecture

The Astro Guru mobile app uses a **dual-provider** analytics architecture:

```
Screen / Feature code
        │
        ▼
   trackEvent()  ──────────────────────┐
   logScreen()                          │
   logLogin() / logSignUp() / ...       │
        │                               │
        ├──► Amplitude (HTTP API)       │
        │    Queue → batch flush        │
        │                               │
        └──► Firebase GA4 (native SDK) ◄┘
             Auto-batched by SDK
             GA4 recommended events
             via typed SDK methods
```

All analytics calls go through a single facade in `src/services/analytics.ts`. Feature code never calls Firebase or Amplitude directly.

## Packages

| Package | Purpose |
|---------|---------|
| `@react-native-firebase/app` (v23.8.8) | Firebase core (native module + Expo config plugin) |
| `@react-native-firebase/analytics` (v23.8.8) | GA4 event logging, screen tracking, user properties |
| `expo-build-properties` | iOS `useFrameworks: "static"` (required by Firebase iOS SDK) |

**Plugin registration** in `app.json`:
- `expo-build-properties` — **must come first** (sets CocoaPods framework mode before Firebase pods resolve)
- `@react-native-firebase/app` — registered as Expo config plugin (auto-links native modules)
- `@react-native-firebase/analytics` — JS-only module, does **not** need plugin registration (no `app.plugin.js`)

## iOS Static Frameworks (Critical)

Firebase iOS SDK requires static frameworks. This is configured via:

```json
// app.json → plugins (first entry)
["expo-build-properties", { "ios": { "useFrameworks": "static" } }]
```

**Without this, the iOS build will fail** with CocoaPods linking errors. This was verified by running `npx expo config` and confirming the resolved plugin order.

## Native Config Files

| Platform | File | Status |
|----------|------|--------|
| Android | `google-services.json` | In repo, verified: project `astro-guru-57921`, package `com.mysticai.app` |
| iOS | `GoogleService-Info.plist` | **NOT YET IN REPO** — must download from Firebase Console |

### Android (verified)

- `app.json → android.googleServicesFile` points to `./google-services.json`
- After `npx expo prebuild --platform android`:
  - `google-services.json` copied to `android/app/`
  - `com.google.gms:google-services:4.4.1` classpath added to root `build.gradle`
  - `apply plugin: 'com.google.gms.google-services'` in app `build.gradle`
  - `DELAY_APP_MEASUREMENT_INIT` set to `false` in `AndroidManifest.xml`
  - Firebase BOM dependency declared via `@react-native-firebase/app/android/build.gradle`
  - Autolinking via `expo-autolinking-settings` + `react-native-firebase` gradle

### iOS (setup required)

1. Go to [Firebase Console](https://console.firebase.google.com/) → Project `astro-guru-57921`
2. Add an iOS app with bundle ID `com.mysticai.app` (if not already added)
3. Download `GoogleService-Info.plist`
4. Place it at `mysticai-mobile/GoogleService-Info.plist`
5. Rebuild: `eas build --profile development --platform ios`

## File Structure

| File | Responsibility |
|------|---------------|
| `src/services/analytics.ts` | Core facade — trackEvent, logScreen, GA4 recommended events, user identity, consent |
| `src/services/analyticsEvents.ts` | Event name constants (taxonomy, 8 categories, 35+ events) |
| `src/services/analyticsHelpers.ts` | 30+ typed convenience functions (call GA4 recommended events where applicable) |
| `src/services/analyticsScreenNames.ts` | Expo Router path → screen name mapping (30+ routes mapped) |
| `src/utils/notificationAnalytics.ts` | Notification event helpers (routes through trackEvent) |
| `src/features/tutorial/analytics/tutorialAnalytics.ts` | Tutorial event helpers (unchanged, already used trackEvent) |
| `src/features/monetization/analytics/monetizationAnalytics.ts` | Monetization event helpers (unchanged, already used trackEvent) |

## GA4 Recommended Events

The analytics facade provides typed methods for GA4 recommended events. These call the Firebase SDK's dedicated methods (e.g., `logLogin`, `logSignUp`) which GA4 recognizes for attribution and funnel analysis:

| Facade Method | GA4 Event | When Used |
|--------------|-----------|-----------|
| `logLogin(method)` | `login` | After successful authentication |
| `logSignUp(method)` | `sign_up` | After successful registration |
| `logSearch(searchTerm)` | `search` | When user performs a search |
| `logShare(contentType, itemId, method)` | `share` | When user shares content |
| `logSelectContent(contentType, itemId)` | `select_content` | When user taps a content item |
| `logTutorialBegin()` | `tutorial_begin` | When onboarding starts |
| `logTutorialComplete()` | `tutorial_complete` | When onboarding completes |
| `logBeginCheckout(value, currency)` | `begin_checkout` | When subscription checkout starts |
| `logPurchase(value, currency, txId)` | `purchase` | When subscription completes |

The typed helpers in `analyticsHelpers.ts` automatically call both the custom event (for Amplitude) and the GA4 recommended event (for Firebase). For example, `trackSignUpCompleted('email')` fires both `sign_up_completed` custom event and the GA4 `sign_up` recommended event.

## Migration from Previous State

### What changed

1. **`analytics.ts`** — Extended with Firebase GA4 as dual provider. Added: `logScreen()`, `logLogin()`, `logSignUp()`, `logSearch()`, `logShare()`, `logSelectContent()`, `logTutorialBegin/Complete()`, `logBeginCheckout()`, `logPurchase()`, `setAnalyticsUserId()`, `setAnalyticsUserProperties()`, `setAnalyticsCollectionEnabled()`, `setAnalyticsConsent()`, `resetAnalyticsIdentity()`. Internal refactor: `firebaseSafe()` wrapper for all Firebase calls.

2. **`notificationAnalytics.ts`** — Previously **console.log only** (had a TODO comment). Now routes through `trackEvent()` so notification events reach both Amplitude and Firebase. **17 notification events** are now actually tracked instead of silently logged.

3. **`_layout.tsx`** — Added `ScreenTracker` (centralized screen_view on every route change) and `AnalyticsIdentityBootstrap` (syncs userId + user properties on auth state change).

4. **`app.json`** — Added `expo-build-properties` (useFrameworks: static), `@react-native-firebase/app` plugin, `ios.googleServicesFile`.

5. **`app.config.ts`** — Changed `delayAppMeasurementInit` from `true` to `false` so GA4 starts immediately.

### What was preserved (zero changes)

- All existing `trackEvent()` calls in **40+ files** continue to work unchanged
- All **100+ existing event names** are preserved — no renames
- `tutorialAnalytics.ts` — **unchanged** (15 events, already used `trackEvent`)
- `monetizationAnalytics.ts` — **unchanged** (25+ events, already used `trackEvent`)
- Amplitude HTTP API flow — **unchanged** (queue, flush, device ID, session ID)
- `envConfig.analytics` — **unchanged** (same env vars)

### Duplicate risk assessment

| Area | Risk | Mitigation |
|------|------|------------|
| Screen tracking vs manual events | `ScreenTracker` fires `screen_view`. Screens also fire manual events (`home_view`, `numerology_screen_viewed`). | **Different event names** — no duplicate. Manual events carry feature-specific properties. Both are valuable for different analyses. |
| GA4 recommended + custom | `trackSignUpCompleted()` fires both `sign_up_completed` and GA4 `sign_up`. | **Intentional dual-fire.** Custom event goes to Amplitude with full params. GA4 recommended event enables Firebase attribution features. They serve different analytical purposes. |
| Notification events | `notificationAnalytics.ts` now sends via trackEvent. | Was **console-only before** — net new data, not a duplicate. |
| Tutorial events | `tutorialAnalytics.ts` already used trackEvent. | **No change** — now also goes to Firebase via the shared facade. |

## How to Add a New Event

### Option A: Quick (direct trackEvent)

```typescript
import { trackEvent } from '../services/analytics';

trackEvent('my_feature_action', {
  feature_name: 'some_feature',
  content_id: '123',
});
```

### Option B: Typed helper (recommended for repeated use)

1. Add the event name to `analyticsEvents.ts`:
```typescript
export const MyFeatureEvents = {
  ACTION_TAKEN: 'my_feature_action_taken',
} as const;
```

2. Add a typed helper to `analyticsHelpers.ts`:
```typescript
export function trackMyFeatureActionTaken(contentId: string): void {
  trackEvent(MyFeatureEvents.ACTION_TAKEN, { content_id: contentId });
}
```

3. Use in your screen:
```typescript
import { trackMyFeatureActionTaken } from '../services/analyticsHelpers';
trackMyFeatureActionTaken('123');
```

### Option C: Feature-specific analytics module

For complex features with many events (like monetization, tutorial), create a dedicated file:
```
src/features/my-feature/analytics/myFeatureAnalytics.ts
```
Follow the pattern in `monetizationAnalytics.ts` or `tutorialAnalytics.ts`.

## Screen Tracking

Centralized in `_layout.tsx → ScreenTracker`. Maps Expo Router paths to readable names via `analyticsScreenNames.ts`.

To add a new screen mapping:
```typescript
// In analyticsScreenNames.ts, add to SCREEN_MAP:
'/(tabs)/my-new-screen': 'my_feature_screen_name',
```

Unrecognized paths get an auto-generated name from the path segments (e.g., `/(tabs)/some-screen` → `some_screen`).

Currently mapped screens (30+):
- Auth/onboarding: `onboarding_welcome`, `auth_signup`, `onboarding_birth_date`, etc.
- Main tabs: `home_dashboard`, `astrology_birth_chart`, `astrology_daily_transits`, `cosmic_planner`, etc.
- Features: `numerology_home`, `compatibility_home`, `dreams_home`, `discover_home`, etc.
- Stack: `profile_home`, `notifications_center`, `tutorial_center`, etc.

## User Identity

Managed by `AnalyticsIdentityBootstrap` in `_layout.tsx`:
- On login: `setAnalyticsUserId(userId)` + `setAnalyticsUserProperties({...})`
- On logout: `resetAnalyticsIdentity()` (clears userId + resets Firebase analytics data)

User properties set:
- `account_type`: `'guest'` or `'registered'`
- `preferred_language`: from user profile
- `zodiac_sign`: from user profile

**Never send PII** (email, name, birth data) as user properties or event parameters.

## Consent / Collection Control

```typescript
import { setAnalyticsCollectionEnabled, setAnalyticsConsent } from '../services/analytics';

// Disable all analytics (both Amplitude + Firebase)
setAnalyticsCollectionEnabled(false);

// Re-enable
setAnalyticsCollectionEnabled(true);

// Firebase-specific consent signals (GDPR/KVKK)
setAnalyticsConsent({
  analytics_storage: 'granted',
  ad_storage: 'denied',
});
```

When disabled, all `trackEvent` / `logScreen` calls become no-ops. The app does not crash.

## Dev Verification

### Step 1: Build a dev client

Firebase native modules **do not work in Expo Go**. You need an EAS dev build:

```bash
# Android
eas build --profile development --platform android

# iOS (requires GoogleService-Info.plist first)
eas build --profile development --platform ios
```

### Step 2: Enable Firebase DebugView

#### Android

```bash
# Enable (persists until disabled)
adb shell setprop debug.firebase.analytics.app com.mysticai.app

# Disable when done
adb shell setprop debug.firebase.analytics.app .none.
```

#### iOS

After `npx expo prebuild --platform ios`, open the Xcode project:

1. Open `mysticai-mobile/ios/Astro Guru.xcworkspace`
2. Product → Scheme → Edit Scheme → Run → Arguments
3. Add `-FIRDebugEnabled` to "Arguments Passed On Launch"
4. Run the app from Xcode

### Step 3: Open Firebase DebugView

1. Firebase Console → Project `astro-guru-57921` → Analytics → DebugView
2. Select the debug device from the dropdown
3. Events appear in real-time as you interact with the app

### Step 4: Verify key events

Navigate through the app and confirm these events appear in DebugView:

| Action | Expected Event | Expected Parameters |
|--------|---------------|-------------------|
| Open app | `screen_view` | `screen_name: "home_dashboard"` |
| Navigate to daily transits | `screen_view` | `screen_name: "astrology_daily_transits"` |
| Login | `login` (GA4 recommended) | `method: "email"` |
| Sign up | `sign_up` (GA4 recommended) | `method: "email"` |
| View numerology | `numerology_screen_viewed` | (existing event, now in Firebase) |
| Open notification | `notification_opened` | `notificationId`, `type` |
| View paywall | `paywall_viewed` | `source`, `feature_name` |
| Complete checkout | `purchase` (GA4 recommended) | `value`, `currency` |
| Watch rewarded ad | `monetization_rewarded_ad_completed` | `module_key`, `reward_amount` |
| Complete onboarding | `tutorial_complete` (GA4 recommended) | (no params) |

### Console Logs (dev mode)

In `__DEV__`, all events are logged with `[analytics]` prefix:
```
[analytics] Firebase Analytics initialized
[analytics] screen: home_dashboard
[analytics] screen_view { screen_name: "home_dashboard", screen_class: "/(tabs)/home" }
[analytics] home_view { ... }
[analytics] setUserId: 12345
[analytics] setUserProperties { account_type: "registered", preferred_language: "tr", zodiac_sign: "aries" }
```

### Amplitude (existing)

Events continue to flush to Amplitude when `EXPO_PUBLIC_ANALYTICS_API_KEY` is set. No change to Amplitude behavior.

## Build Verification Results

### What was verified (automated)

| Check | Result |
|-------|--------|
| `npx expo config` resolves all plugins | Passed — expo-build-properties, @react-native-firebase/app, react-native-google-mobile-ads all resolved |
| `expo-build-properties` sets `useFrameworks: "static"` | Passed — confirmed in resolved config |
| `@react-native-firebase/analytics` NOT in plugins (JS-only) | Passed — removed after initial PluginError discovery |
| `npx expo prebuild --platform android` | Passed — native directory generated |
| `google-services.json` copied to `android/app/` | Passed |
| `com.google.gms.google-services` plugin applied | Passed |
| `DELAY_APP_MEASUREMENT_INIT: false` in AndroidManifest | Passed |
| Firebase BOM dependency declared | Passed |
| JS bundle export (Metro bundler) | Passed — 23.1 MB bundle, no missing modules |
| TypeScript compilation (analytics files) | Passed — zero errors in all analytics files |
| TypeScript compilation (full project) | Pre-existing errors only (unrelated to analytics) |

### What requires manual verification (needs device)

| Check | How to verify |
|-------|---------------|
| Firebase SDK initializes on device | Console: `[analytics] Firebase Analytics initialized` |
| `screen_view` appears in DebugView | Navigate between tabs, check DebugView |
| `login` GA4 event fires | Log in, check DebugView for `login` event |
| User properties set after login | DebugView → User Properties tab |
| `resetAnalyticsData` works on logout | Log out, check user properties cleared |
| iOS build with static frameworks | Run `eas build --platform ios` (requires GoogleService-Info.plist) |
| Collection disable stops transmission | Call `setAnalyticsCollectionEnabled(false)`, verify no events in DebugView |

## Event Taxonomy

See `src/services/analyticsEvents.ts` for the complete list. Key categories:

- **AUTH**: sign_up_started/completed, login_completed, onboarding_started/completed, birth_chart_profile_completed
- **CONTENT**: home_card_clicked, feature_opened, search_performed, content_shared, notification_opened
- **ASTROLOGY**: birth_chart_viewed, daily_transit_viewed, transit_detail_opened, planner_day_opened, planner_reminder_created, decision_compass_started/result_viewed
- **NUMEROLOGY**: numerology_home_viewed, report_viewed, detail_expanded, name_analysis_started/completed
- **COMPATIBILITY**: compatibility_started, result_viewed, share_clicked
- **DREAMS**: dream_interpretation_started/completed, dream_history_opened
- **PREMIUM**: paywall_viewed/cta_clicked, subscription_checkout_started/purchase_completed, subscription_restore_clicked, premium_feature_blocked/unlocked
- **ADS**: rewarded_ad_offer_shown/started/completed/reward_granted/failed, ad_to_feature_unlock_completed
- **ENGAGEMENT**: tutorial_started/completed, push_permission_prompt_shown/granted/denied

## Parameter Standards

- All parameter names: `snake_case`
- No PII: never send email, phone, full name, birth text
- Use internal user ID (numeric), never email
- Common parameters: `screen_name`, `feature_name`, `module_name`, `content_id`, `content_type`, `source`, `entry_point`, `cta_name`, `placement`, `plan_type`, `currency`, `value`, `method`, `result_status`, `error_code`, `ad_type`, `reward_type`, `reward_value`
- Undefined/null values are automatically stripped by `sanitizeParams()`
- GA4 parameter limits: 25 custom parameters per event, 40 characters per parameter name, 100 characters per parameter value

## EAS Build Compatibility

Firebase native modules require a dev build (not Expo Go):
```bash
# Development build
eas build --profile development --platform android
eas build --profile development --platform ios

# Production build
eas build --profile production --platform all
```

Firebase Analytics **gracefully fails** in Expo Go with a console warning — the app does not crash. The `getFirebase()` function returns `null` and all Firebase calls become silent no-ops via the `firebaseSafe()` wrapper.
