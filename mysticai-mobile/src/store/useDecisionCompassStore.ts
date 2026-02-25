import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';

interface DecisionCompassState {
  hiddenActivityKeys: string[];
  toggleHiddenActivity: (activityKey: string) => void;
  resetHiddenActivities: () => void;
  setHiddenActivities: (keys: string[]) => void;
}

export const useDecisionCompassStore = create<DecisionCompassState>()(
  persist(
    (set, get) => ({
      hiddenActivityKeys: [],
      toggleHiddenActivity: (activityKey) => {
        const current = get().hiddenActivityKeys;
        const next = current.includes(activityKey)
          ? current.filter((key) => key !== activityKey)
          : [...current, activityKey];
        set({ hiddenActivityKeys: next });
      },
      resetHiddenActivities: () => set({ hiddenActivityKeys: [] }),
      setHiddenActivities: (keys) => set({ hiddenActivityKeys: Array.from(new Set(keys)) }),
    }),
    {
      name: 'decision-compass-store',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
