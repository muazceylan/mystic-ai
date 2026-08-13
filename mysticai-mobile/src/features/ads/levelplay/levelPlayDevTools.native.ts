import { LevelPlay } from 'unity-levelplay-mediation';
import {
  LEVELPLAY_REWARDED_SERVER_PARAMS_KEY,
  getLevelPlayConfig,
  isLevelPlayDevToolsEnabled,
  levelPlayDevLog,
} from './levelPlay.config';
import {
  getLevelPlayInitializationSnapshot,
  isLevelPlayInitialized,
  validateLevelPlayIntegration,
  type LevelPlayInitializationState,
} from './levelPlay.service';

// Development-only helpers for validating the LevelPlay integration on a device
// or emulator. Nothing here participates in the production ad flow: LevelPlay is
// still initialized exactly once, from `initializeLevelPlay`.
//
// This module depends on `levelPlay.service` and never the other way around, so
// the import graph stays acyclic.

export type LevelPlayDevToolsStatus = {
  /** False in production builds and on web — every helper is then a no-op. */
  enabled: boolean;
  initializationState: LevelPlayInitializationState;
  initializationError: string | null;
  /** Reported as booleans; the raw keys are never logged. */
  appKeyConfigured: boolean;
  rewardedAdUnitConfigured: boolean;
};

/** Snapshot for dev surfaces. Contains no secrets. */
export function getLevelPlayDevToolsStatus(): LevelPlayDevToolsStatus {
  const config = getLevelPlayConfig();
  const snapshot = getLevelPlayInitializationSnapshot();
  return {
    enabled: isLevelPlayDevToolsEnabled(),
    initializationState: snapshot.state,
    initializationError: snapshot.error?.message ?? null,
    appKeyConfigured: Boolean(config.appKey),
    rewardedAdUnitConfigured: Boolean(config.rewardedAdUnitId),
  };
}

/**
 * Opens the LevelPlay Test Suite. Development-only: a no-op in production
 * builds. Calling it before LevelPlay is initialized logs and returns rather
 * than throwing.
 *
 * The Test Suite drives its own ad instances, so it never reaches the app's
 * rewarded listener and cannot grant Guru through the client. It does, however,
 * share the SDK's global metadata, which is why the reward session is cleared
 * first — see below.
 *
 * @returns whether the Test Suite launch request reached the SDK.
 */
export async function launchLevelPlayTestSuite(): Promise<boolean> {
  if (!isLevelPlayDevToolsEnabled()) return false;

  if (!isLevelPlayInitialized()) {
    const { state, error } = getLevelPlayInitializationSnapshot();
    levelPlayDevLog(
      `Test Suite launch skipped — LevelPlay is not initialized (state: ${state}).`,
      error?.message ?? '',
    );
    return false;
  }

  try {
    // `LevelPlay_Rewarded_Server_Params` is global SDK state, not per-ad-instance.
    // A production `show()` that was dismissed leaves its reward session behind in
    // status CREATED, so a rewarded ad played from the Test Suite would still carry
    // that session id into the S2S callback and credit the real wallet. Clearing the
    // key makes any Test Suite impression arrive without a session, which the
    // backend rejects as INVALID_REWARD_SESSION.
    await LevelPlay.setMetaData(LEVELPLAY_REWARDED_SERVER_PARAMS_KEY, []);
    levelPlayDevLog('Reward server params cleared — Test Suite ads cannot credit the wallet');

    await LevelPlay.launchTestSuite();
    levelPlayDevLog('Test Suite launched');
    return true;
  } catch (testSuiteError) {
    levelPlayDevLog('Test Suite launch failed.', testSuiteError);
    return false;
  }
}

export { validateLevelPlayIntegration };
