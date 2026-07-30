import { Platform } from 'react-native';

export type LevelPlayPlatformConfig = {
  appKey: string | null;
  rewardedAdUnitId: string | null;
  available: boolean;
  debugEnabled: boolean;
};

function clean(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function getLevelPlayConfig(): LevelPlayPlatformConfig {
  const selected = Platform.select({
    ios: {
      appKey: clean(process.env.EXPO_PUBLIC_LEVELPLAY_IOS_APP_KEY),
      rewardedAdUnitId: clean(
        process.env.EXPO_PUBLIC_LEVELPLAY_IOS_REWARDED_AD_UNIT_ID,
      ),
    },
    android: {
      appKey: clean(process.env.EXPO_PUBLIC_LEVELPLAY_ANDROID_APP_KEY),
      rewardedAdUnitId: clean(
        process.env.EXPO_PUBLIC_LEVELPLAY_ANDROID_REWARDED_AD_UNIT_ID,
      ),
    },
    default: {
      appKey: null,
      rewardedAdUnitId: null,
    },
  });

  const appKey = selected?.appKey ?? null;
  const rewardedAdUnitId = selected?.rewardedAdUnitId ?? null;
  return {
    appKey,
    rewardedAdUnitId,
    available: Boolean(appKey && rewardedAdUnitId),
    debugEnabled:
      __DEV__ && process.env.EXPO_PUBLIC_LEVELPLAY_DEBUG?.trim().toLowerCase() === 'true',
  };
}
