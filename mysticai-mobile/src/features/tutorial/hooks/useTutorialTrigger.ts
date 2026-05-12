import { useCallback } from 'react';
import type { TutorialStartReason } from '../domain/tutorial.types';
import { useTutorial } from './useTutorial';

export function useTutorialTrigger(screenKey: string) {
  const { requestTutorialForScreen } = useTutorial();

  const trigger = useCallback(
    async (reason: TutorialStartReason) => {
      return requestTutorialForScreen(screenKey, reason);
    },
    [requestTutorialForScreen, screenKey],
  );

  const triggerInitial = useCallback(async (options?: { includeFirstAppOpen?: boolean }): Promise<boolean> => {
    if (options?.includeFirstAppOpen) {
      if (await trigger('first_app_open')) return true;
    }
    if (await trigger('first_screen_visit')) return true;
    if (await trigger('version_changed')) return true;
    return false;
  }, [trigger]);

  return {
    trigger,
    triggerInitial,
  };
}
