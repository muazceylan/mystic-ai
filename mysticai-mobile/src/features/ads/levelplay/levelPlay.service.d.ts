// Type-only resolution shim for the extensionless `./levelPlay.service` import.
// Metro resolves the real runtime module per-platform via
// `levelPlay.service.native.ts` / `levelPlay.service.web.ts`; TypeScript (no
// `moduleSuffixes` configured) resolves the extensionless specifier to this
// `.d.ts` instead. Mirrors the `MainTabPager.d.ts` convention used for
// `MainTabPager.native.tsx` / `MainTabPager.web.tsx`.
import type { AdsInitializationOptions } from '../../monetization/providers/mobileAds.types';

export type LevelPlayInitializationState =
  | 'idle'
  | 'initializing'
  | 'initialized'
  | 'failed';

export declare function getLevelPlayInitializationSnapshot(): {
  state: LevelPlayInitializationState;
  error: Error | null;
  initializedUserId: string | null;
};

export declare function isLevelPlayInitialized(): boolean;

export declare function initializeLevelPlay(
  options: AdsInitializationOptions,
  userId?: string | number | null,
): Promise<boolean>;

export declare function validateLevelPlayIntegration(): Promise<boolean>;
