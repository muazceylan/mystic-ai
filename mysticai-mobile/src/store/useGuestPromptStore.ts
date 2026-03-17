import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Persisted store that tracks guest interaction count and auto-prompt history.
 *
 * - interactionCount: incremented on every meaningful user action
 * - lastPromptedAt: Unix ms timestamp of the last time the link-account prompt was shown
 *
 * Reset on logout or account linking (useAuthStore.logout() should call reset()).
 */
interface GuestPromptState {
  interactionCount: number;
  lastPromptedAt: number | null;

  recordInteraction: () => void;
  markPrompted: () => void;
  reset: () => void;
}

export const useGuestPromptStore = create<GuestPromptState>()(
  persist(
    (set) => ({
      interactionCount: 0,
      lastPromptedAt: null,

      recordInteraction: () =>
        set((s) => ({ interactionCount: s.interactionCount + 1 })),

      markPrompted: () =>
        set({ lastPromptedAt: Date.now() }),

      reset: () =>
        set({ interactionCount: 0, lastPromptedAt: null }),
    }),
    {
      name: 'mysticai_guest_prompt',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
