import { Platform } from 'react-native';

export type LevelPlayPlatformConfig = {
  appKey: string | null;
  rewardedAdUnitId: string | null;
  available: boolean;
  debugEnabled: boolean;
};

/**
 * SDK metadata key that opts this build into the LevelPlay Test Suite. The
 * native SDK reads it while initializing, so it must be set before
 * `LevelPlay.init()` or the Test Suite stays unavailable for the session.
 */
export const LEVELPLAY_TEST_SUITE_METADATA_KEY = 'is_test_suite';

/**
 * SDK metadata key carrying the server-to-server reward session. Owned by the
 * rewarded flow (`levelPlayRewarded.service`), but it is global SDK state, so
 * the dev tools clear it before opening the Test Suite.
 */
export const LEVELPLAY_REWARDED_SERVER_PARAMS_KEY = 'LevelPlay_Rewarded_Server_Params';

/**
 * Single switch for every LevelPlay test/debug affordance. `__DEV__` is `false`
 * in release bundles, so each guarded branch is dead code in production; web
 * never loads the native SDK at all.
 */
export function isLevelPlayDevToolsEnabled(): boolean {
  return __DEV__ && Platform.OS !== 'web';
}

/** Dev-only logger. Silent in production and on web. */
export function levelPlayDevLog(message: string, ...details: unknown[]): void {
  if (!isLevelPlayDevToolsEnabled()) return;
  console.log(`[LevelPlay][DEV] ${message}`, ...details);
}

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
