import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import type { AdsInitializationOptions } from '../../monetization/providers/mobileAds.types';
import {
  initializeLevelPlay,
  getLevelPlayInitializationSnapshot,
} from './levelPlay.service';
import {
  levelPlayRewardedService,
  type LevelPlayRewardedSnapshot,
} from './levelPlayRewarded.service';

const INITIAL_SNAPSHOT: LevelPlayRewardedSnapshot = {
  state: 'idle',
  error: null,
  isInitializing: false,
  isLoading: false,
  isShowing: false,
  ready: false,
};

export function useLevelPlayRewarded(options: AdsInitializationOptions) {
  const userId = useAuthStore((store) => store.user?.id);
  const [snapshot, setSnapshot] = useState(INITIAL_SNAPSHOT);

  useEffect(() => levelPlayRewardedService.subscribe(setSnapshot), []);

  const initialize = useCallback(async () => {
    levelPlayRewardedService.markInitializing();
    const initialized = await initializeLevelPlay(options, userId);
    if (initialized) levelPlayRewardedService.ensureInstance();
    return initialized;
  }, [
    options.personalizedAdvertisingAllowed,
    options.tagForChildDirectedTreatment,
    options.trackingConsentStatus,
    userId,
  ]);

  const load = useCallback(() => levelPlayRewardedService.load(), []);
  const show = useCallback(
    (placementName?: string) => levelPlayRewardedService.show(placementName),
    [],
  );
  const isReady = useCallback(() => levelPlayRewardedService.isReady(), []);

  return {
    initialize,
    load,
    show,
    isReady,
    state: snapshot.state,
    error: snapshot.error ?? getLevelPlayInitializationSnapshot().error,
    isInitializing: snapshot.isInitializing,
    isLoading: snapshot.isLoading,
    isShowing: snapshot.isShowing,
  };
}
