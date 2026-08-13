import { validateLevelPlayIntegration } from './levelPlay.service';
import type { LevelPlayInitializationState } from './levelPlay.service';

// Web build never imports the native LevelPlay mediation SDK (see
// levelPlay.service.web.ts). This stub keeps the same public contract as
// `levelPlayDevTools.native.ts` so callers work unmodified across platforms;
// every operation is a controlled no-op.

export type LevelPlayDevToolsStatus = {
  enabled: boolean;
  initializationState: LevelPlayInitializationState;
  initializationError: string | null;
  appKeyConfigured: boolean;
  rewardedAdUnitConfigured: boolean;
};

export function getLevelPlayDevToolsStatus(): LevelPlayDevToolsStatus {
  return {
    enabled: false,
    initializationState: 'idle',
    initializationError: null,
    appKeyConfigured: false,
    rewardedAdUnitConfigured: false,
  };
}

export async function launchLevelPlayTestSuite(): Promise<boolean> {
  // no-op: the Test Suite ships with the native SDK, which web never loads
  return false;
}

export { validateLevelPlayIntegration };
