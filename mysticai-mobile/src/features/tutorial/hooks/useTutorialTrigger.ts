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

  const triggerInitial = useCallback(async (options?: { includeFirstAppOpen?: boolean }) => {
    if (options?.includeFirstAppOpen) {
      await trigger('first_app_open');
    }
    await trigger('first_screen_visit');
    await trigger('version_changed');
  }, [trigger]);

  return {
    trigger,
    triggerInitial,
  };
}
