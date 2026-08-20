import { ExpoConfig, ConfigContext } from 'expo/config';
import withLevelPlay from './plugins/withLevelPlay.js';

// AdMob App IDs — required at native build time.
// Falls back to Google-provided test App IDs when not set.
const ADMOB_ANDROID_APP_ID =
  process.env.ADMOB_ANDROID_APP_ID || 'ca-app-pub-3940256099942544~3347511713';
const ADMOB_IOS_APP_ID =
  process.env.ADMOB_IOS_APP_ID || 'ca-app-pub-3940256099942544~1458002511';
const TRACKING_PERMISSION_DESCRIPTION =
  'Cihaz tanımlayıcınız kişiselleştirilmiş reklamlar sunmak ve reklam performansını ölçmek için kullanılabilir.';

export default ({ config }: ConfigContext): ExpoConfig =>
  withLevelPlay({
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
