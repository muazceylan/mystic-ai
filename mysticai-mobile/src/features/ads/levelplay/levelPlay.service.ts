import {
  LevelPlay,
  LevelPlayInitRequest,
  LevelPlayPrivacySettings,
  type LevelPlayInitError,
  type LevelPlayInitListener,
} from 'unity-levelplay-mediation';
import type { AdsInitializationOptions } from '../../monetization/providers/mobileAds.types';
import { getLevelPlayConfig } from './levelPlay.config';

export type LevelPlayInitializationState =
  | 'idle'
  | 'initializing'
  | 'initialized'
  | 'failed';

const INIT_TIMEOUT_MS = 20_000;

let state: LevelPlayInitializationState = 'idle';
let error: Error | null = null;
let initPromise: Promise<boolean> | null = null;
let initializedUserId: string | null = null;

function toError(value: unknown, fallback: string): Error {
  if (value instanceof Error) return value;
  if (value && typeof value === 'object' && 'errorMessage' in value) {
    return new Error(String((value as { errorMessage: unknown }).errorMessage));
  }
  return new Error(fallback);
}

export function getLevelPlayInitializationSnapshot() {
  return { state, error, initializedUserId };
}

export function isLevelPlayInitialized(): boolean {
  return state === 'initialized';
}

export async function initializeLevelPlay(
  options: AdsInitializationOptions,
  userId?: string | number | null,
): Promise<boolean> {
  const stableUserId = userId == null ? null : String(userId);
  if (state === 'initialized') {
    if (stableUserId && stableUserId !== initializedUserId) {
      try {
        await LevelPlay.setDynamicUserId(stableUserId);
        initializedUserId = stableUserId;
      } catch (dynamicUserError) {
        error = toError(dynamicUserError, 'LevelPlay user identity update failed.');
        return false;
      }
    }
    return true;
  }
  if (initPromise) return initPromise;

  initPromise = doInitialize(options, stableUserId).finally(() => {
    initPromise = null;
  });
  return initPromise;
}

async function doInitialize(
  options: AdsInitializationOptions,
  stableUserId: string | null,
): Promise<boolean> {
  const config = getLevelPlayConfig();
  if (!config.available || !config.appKey) {
    state = 'failed';
    error = new Error('LevelPlay is unavailable: platform environment is incomplete.');
    return false;
  }

  state = 'initializing';
  error = null;

  try {
    // This app's existing AdMob policy marks traffic as not child-directed. Keep
    // the same central policy for LevelPlay instead of introducing a second age rule.
    await LevelPlayPrivacySettings.setCOPPA(
      options.tagForChildDirectedTreatment ?? false,
    );
    await LevelPlay.setMetaData('UnityAds_coppa', [
      String(options.tagForChildDirectedTreatment ?? false),
    ]);
    await LevelPlay.setConsent(options.personalizedAdvertisingAllowed);

    if (config.debugEnabled) {
      await LevelPlay.setAdaptersDebug(true);
    }

    const builder = LevelPlayInitRequest.builder(config.appKey);
    if (stableUserId) builder.withUserId(stableUserId);
    const request = builder.build();

    const initialized = await new Promise<boolean>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('LevelPlay initialization timed out.')),
        INIT_TIMEOUT_MS,
      );
      const listener: LevelPlayInitListener = {
        onInitSuccess: () => {
          clearTimeout(timeout);
          resolve(true);
        },
        onInitFailed: (initError: LevelPlayInitError) => {
          clearTimeout(timeout);
          reject(toError(initError, 'LevelPlay initialization failed.'));
        },
      };

      void LevelPlay.init(request, listener).catch((initError) => {
        clearTimeout(timeout);
        reject(toError(initError, 'LevelPlay initialization failed.'));
      });
    });

    state = initialized ? 'initialized' : 'failed';
    initializedUserId = initialized ? stableUserId : null;

    if (initialized && config.debugEnabled) {
      void LevelPlay.validateIntegration().catch((validationError) => {
        console.warn('[LevelPlay] Integration validation failed.', validationError);
      });
    }
    return initialized;
  } catch (initializationError) {
    state = 'failed';
    error = toError(initializationError, 'LevelPlay initialization failed.');
    initializedUserId = null;
    if (__DEV__) console.warn('[LevelPlay] Initialization failed.', error.message);
    return false;
  }
}
