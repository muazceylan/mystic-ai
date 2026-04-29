import { ExpoConfig, ConfigContext } from 'expo/config';

// AdMob App IDs — required at native build time.
// Falls back to Google-provided test App IDs when not set.
const ADMOB_ANDROID_APP_ID =
  process.env.ADMOB_ANDROID_APP_ID || 'ca-app-pub-3940256099942544~3347511713';
const ADMOB_IOS_APP_ID =
  process.env.ADMOB_IOS_APP_ID || 'ca-app-pub-3940256099942544~1458002511';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'Astro Guru',
  slug: config.slug ?? 'mystic',
  ios: {
    ...config.ios,
    infoPlist: {
      ...config.ios?.infoPlist,
      NSUserTrackingUsageDescription:
        'Odullu video deneyimini iyilestirmek ve reklam olcumunu desteklemek icin izin istiyoruz.',
    },
  },
  plugins: [
    ...(config.plugins ?? []),
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: ADMOB_ANDROID_APP_ID,
        iosAppId: ADMOB_IOS_APP_ID,
        delayAppMeasurementInit: false,
        userTrackingUsageDescription:
          'Odullu video deneyimini iyilestirmek ve reklam olcumunu desteklemek icin izin istiyoruz.',
      },
    ],
  ],
});
