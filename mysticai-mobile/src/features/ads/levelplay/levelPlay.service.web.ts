import type { AdsInitializationOptions } from '../../monetization/providers/mobileAds.types';

// Web build never imports the native LevelPlay mediation SDK (native-only;
// pulls in `codegenNativeComponent`, which crashes Metro's web bundling). This
// stub keeps the same public contract as `levelPlay.service.native.ts` so
// callers work unmodified across platforms.
export type LevelPlayInitializationState =
  | 'idle'
  | 'initializing'
  | 'initialized'
  | 'failed';

export function getLevelPlayInitializationSnapshot() {
  return {
    state: 'idle' as LevelPlayInitializationState,
    error: null as Error | null,
    initializedUserId: null as string | null,
  };
}

export function isLevelPlayInitialized(): boolean {
  return false;
}

export async function initializeLevelPlay(
  _options: AdsInitializationOptions,
  _userId?: string | number | null,
): Promise<boolean> {
  if (__DEV__) {
    console.log('[LevelPlay] Web platform — LevelPlay is unsupported, skipping initialization.');
  }
  return false;
}

export async function validateLevelPlayIntegration(): Promise<boolean> {
  // no-op: there is no native SDK on web to validate
  return false;
}
