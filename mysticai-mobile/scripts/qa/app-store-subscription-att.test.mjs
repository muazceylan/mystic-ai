import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const appConfig = read('app.config.ts');
const firebaseConfig = JSON.parse(read('firebase.json'))['react-native'];
const infoPlist = read('ios/AstroGuru/Info.plist');
const layout = read('src/app/_layout.tsx');
const analytics = read('src/services/analytics.ts');
const paywall = read('src/features/monetization/components/PremiumPaywallSheet.tsx');
const terms = read('src/app/terms.tsx');
const welcome = read('src/app/(auth)/welcome.tsx');
const linkAccount = read('src/app/link-account.tsx');
const onboardingGuard = read('src/utils/authOnboarding.ts');
const revenueCatService = read('src/features/monetization/services/revenueCatService.ts');

assert.match(appConfig, /expo-tracking-transparency/);
assert.match(appConfig, /NSUserTrackingUsageDescription/);
assert.match(infoPlist, /<key>NSUserTrackingUsageDescription<\/key>/);
assert.match(infoPlist, /<key>GADDelayAppMeasurementInit<\/key>\s*<true\/>/);
assert.equal(firebaseConfig.analytics_auto_collection_enabled, false);
assert.equal(firebaseConfig.analytics_default_allow_ad_storage, false);
assert.equal(firebaseConfig.analytics_default_allow_ad_user_data, false);
assert.equal(firebaseConfig.analytics_default_allow_ad_personalization_signals, false);

const privacyBootstrapStart = layout.indexOf('function PrivacyBootstrap');
const privacyBootstrapEnd = layout.indexOf('function BuildInfoBootstrap');
const privacyBootstrap = layout.slice(privacyBootstrapStart, privacyBootstrapEnd);
assert.ok(privacyBootstrapStart >= 0 && privacyBootstrapEnd > privacyBootstrapStart);
assert.doesNotMatch(privacyBootstrap, /runAfterInteractions/);
assert.match(privacyBootstrap, /AppState\.currentState !== 'active'/);
assert.match(analytics, /Platform\.OS === 'ios'\s*\? false/);

assert.match(paywall, /useTrialDisplayState/);
assert.match(paywall, /selectedTrialDisplay\.status === 'eligible'/);
assert.match(paywall, /verifiedTrialEligible: selectedHasFreeTrial/);
assert.doesNotMatch(paywall, /has_free_trial:\s*true/);
assert.doesNotMatch(paywall, /PREMIUM_TRIAL_DAYS/);
assert.match(paywall, /router\.push\('\/terms'\)/);
assert.match(paywall, /router\.push\('\/privacy'\)/);
assert.match(terms, /itunes\/dev\/stdeula/);

// Paywall fiyati her zaman store'un kendi bicimlendirdigi metinden gelmeli.
// Kendi Intl bicimlendirmemiz cihaz locale'inin para birimini uygulayabildigi icin
// paywall dolar, App Store odeme sayfasi TL gosterebiliyordu.
assert.match(
  revenueCatService,
  /return getStoreProductPriceString\(product, period\)\s*\n?\s*\?\? formatCurrencyAmount\(/,
);
assert.doesNotMatch(revenueCatService, /style: 'currency'/);

for (const appleAuthSurface of [welcome, linkAccount]) {
  assert.match(appleAuthSurface, /AppleAuthentication\.AppleAuthenticationButton/);
  assert.match(appleAuthSurface, /AppleAuthenticationButtonType\.CONTINUE/);
  assert.match(appleAuthSurface, /AppleAuthenticationButtonStyle\.BLACK/);
  assert.match(appleAuthSurface, /AppleAuthenticationScope\.FULL_NAME/);
  assert.match(appleAuthSurface, /AppleAuthenticationScope\.EMAIL/);
}
assert.match(welcome, /firstName:\s*credential\.fullName\?\.givenName/);
assert.match(welcome, /lastName:\s*credential\.fullName\?\.familyName/);
assert.doesNotMatch(onboardingGuard, /isBlank\(user\.(?:firstName|lastName|email)\)/);

console.log('App Store subscription + ATT static QA passed');
