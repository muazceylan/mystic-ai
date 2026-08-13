// Type-only resolution shim for the extensionless `./levelPlayDevTools` import
// — see levelPlay.service.d.ts for why this file exists.
import type { LevelPlayInitializationState } from './levelPlay.service';

export type LevelPlayDevToolsStatus = {
  enabled: boolean;
  initializationState: LevelPlayInitializationState;
  initializationError: string | null;
  appKeyConfigured: boolean;
  rewardedAdUnitConfigured: boolean;
};

export declare function getLevelPlayDevToolsStatus(): LevelPlayDevToolsStatus;

export declare function launchLevelPlayTestSuite(): Promise<boolean>;

export declare function validateLevelPlayIntegration(): Promise<boolean>;
