import { ExpoConfig, ConfigContext } from 'expo/config';

// AdMob App IDs — required at native build time.
// Falls back to Google-provided test App IDs when not set.
const ADMOB_ANDROID_APP_ID =
  process.env.ADMOB_ANDROID_APP_ID || 'ca-app-pub-3940256099942544~3347511713';
const ADMOB_IOS_APP_ID =
  process.env.ADMOB_IOS_APP_ID || 'ca-app-pub-3940256099942544~1458002511';
const TRACKING_PERMISSION_DESCRIPTION =
  'Cihaz tanımlayıcınız kişiselleştirilmiş reklamlar sunmak ve reklam performansını ölçmek için kullanılabilir.';

// NOTE: this project uses the BARE workflow — android/ and ios/ are committed
// and `expo prebuild` is not part of any build path, so the config plugins below
// do NOT reach the native projects. Native AdMob settings (App IDs, mediation
// adapters, SKAdNetwork) live in android/app/build.gradle, ios/Podfile,
// AndroidManifest.xml and Info.plist, and are enforced at build time by
// scripts/verify-native-ad-config.mjs. Keep this file in sync so that a future
// `expo prebuild` reproduces the same native config instead of regressing it.
export default ({ config }: ConfigContext): ExpoConfig =>
  ({
  ...config,
  name: config.name ?? 'Astro Guru',
  slug: config.slug ?? 'mystic',
  ios: {
    ...config.ios,
    infoPlist: {
      ...config.ios?.infoPlist,
      ITSAppUsesNonExemptEncryption: false,
      NSUserTrackingUsageDescription: TRACKING_PERMISSION_DESCRIPTION,
    },
  },
  plugins: [
    ...(config.plugins ?? []),
    [
      'expo-tracking-transparency',
      {
        userTrackingPermission: TRACKING_PERMISSION_DESCRIPTION,
      },
    ],
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: ADMOB_ANDROID_APP_ID,
        iosAppId: ADMOB_IOS_APP_ID,
        delayAppMeasurementInit: true,
        userTrackingUsageDescription: TRACKING_PERMISSION_DESCRIPTION,
      },
    ],
  ],
  });
