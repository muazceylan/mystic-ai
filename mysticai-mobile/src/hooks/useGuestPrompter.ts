import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import { useAuthStore, isGuestUser } from '../store/useAuthStore';
import { useGuestPromptStore } from '../store/useGuestPromptStore';
import { trackEvent } from '../services/analytics';

/** Number of recorded interactions before the auto-prompt is shown. */
const PROMPT_THRESHOLD = 3;

/** Minimum time (ms) between two consecutive auto-prompts. */
const PROMPT_COOLDOWN_MS = 24 * 60 * 60 * 1_000; // 24 hours

/**
 * Manages the auto-prompt conversion strategy for guest users.
 *
 * After `PROMPT_THRESHOLD` recorded interactions the hook will
 * return `shouldPrompt = true` (subject to a 24h cooldown). The
 * caller is responsible for rendering the GuestGate or navigating
 * to /link-account when `shouldPrompt` fires.
 *
 * Usage:
 * ```ts
 * const { recordInteraction, guestGateVisible, dismissGuestGate } = useGuestPrompter();
 *
 * // Call this at meaningful user actions (e.g. opening a feature):
 * recordInteraction();
 *
 * // Render the gate:
 * <GuestGate visible={guestGateVisible} onClose={dismissGuestGate} />
 * ```
 */
export function useGuestPrompter() {
  const user = useAuthStore((s) => s.user);
  const record = useGuestPromptStore((s) => s.recordInteraction);
  const markPrompted = useGuestPromptStore((s) => s.markPrompted);
  const interactionCount = useGuestPromptStore((s) => s.interactionCount);
  const lastPromptedAt = useGuestPromptStore((s) => s.lastPromptedAt);

  const [guestGateVisible, setGuestGateVisible] = useState(false);

  const shouldAutoPrompt = useCallback((): boolean => {
    if (!isGuestUser(user)) return false;
    if (interactionCount < PROMPT_THRESHOLD) return false;

    const now = Date.now();
    if (lastPromptedAt !== null && now - lastPromptedAt < PROMPT_COOLDOWN_MS) {
      return false;
    }
    return true;
  }, [user, interactionCount, lastPromptedAt]);

  const recordInteraction = useCallback(() => {
    if (!isGuestUser(user)) return;
    record();

    if (shouldAutoPrompt()) {
      markPrompted();
      trackEvent('guest_auto_prompt_shown', {
        user_type: 'GUEST',
        interaction_count: interactionCount + 1,
        entry_point: 'auto_prompt',
      });
      setGuestGateVisible(true);
    }
  }, [user, record, shouldAutoPrompt, markPrompted, interactionCount]);

  const dismissGuestGate = useCallback(() => {
    setGuestGateVisible(false);
    trackEvent('guest_auto_prompt_dismissed', {
      user_type: 'GUEST',
      entry_point: 'auto_prompt',
    });
  }, []);

  const navigateToLinkAccount = useCallback(() => {
    setGuestGateVisible(false);
    trackEvent('guest_auto_prompt_cta_tapped', {
      user_type: 'GUEST',
      entry_point: 'auto_prompt',
    });
    router.push('/link-account');
  }, []);

  return {
    recordInteraction,
    guestGateVisible,
    dismissGuestGate,
    navigateToLinkAccount,
  };
}
