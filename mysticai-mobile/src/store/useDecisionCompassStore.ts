import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';
import { bindUserScopedPersist, getInitialUserScopedStoreName } from './userScopedPersist';

interface DecisionCompassState {
  hiddenActivityKeys: string[];
  hiddenCategoryKeys: string[];
  toggleHiddenActivity: (activityKey: string) => void;
  resetHiddenActivities: () => void;
  setHiddenActivities: (keys: string[]) => void;
  toggleHiddenCategory: (categoryKey: string) => void;
  setCategoryVisibility: (categoryKey: string, visible: boolean) => void;
  resetHiddenCategories: () => void;
}

const DECISION_COMPASS_STORE_NAME = 'decision-compass-store';
const EMPTY_DECISION_COMPASS_STATE: Pick<
  DecisionCompassState,
  'hiddenActivityKeys' | 'hiddenCategoryKeys'
> = {
  hiddenActivityKeys: [],
  hiddenCategoryKeys: [],
};

export const useDecisionCompassStore = create<DecisionCompassState>()(
  persist(
    (set, get) => ({
      ...EMPTY_DECISION_COMPASS_STATE,
      toggleHiddenActivity: (activityKey) => {
        const current = get().hiddenActivityKeys;
        const next = current.includes(activityKey)
          ? current.filter((key) => key !== activityKey)
          : [...current, activityKey];
        set({ hiddenActivityKeys: next });
      },
      resetHiddenActivities: () => set({ hiddenActivityKeys: [] }),
      setHiddenActivities: (keys) => set({ hiddenActivityKeys: Array.from(new Set(keys)) }),
      toggleHiddenCategory: (categoryKey) => {
        const key = categoryKey.trim();
        if (!key) return;
        const current = get().hiddenCategoryKeys;
        const next = current.includes(key)
          ? current.filter((item) => item !== key)
          : [...current, key];
        set({ hiddenCategoryKeys: next });
      },
      setCategoryVisibility: (categoryKey, visible) => {
        const key = categoryKey.trim();
        if (!key) return;
        const current = get().hiddenCategoryKeys;
        const hidden = current.includes(key);
        if (visible && hidden) {
          set({ hiddenCategoryKeys: current.filter((item) => item !== key) });
          return;
        }
        if (!visible && !hidden) {
          set({ hiddenCategoryKeys: [...current, key] });
        }
      },
      resetHiddenCategories: () => set({ hiddenCategoryKeys: [] }),
    }),
    {
      name: getInitialUserScopedStoreName(DECISION_COMPASS_STORE_NAME),
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);

bindUserScopedPersist({
  store: useDecisionCompassStore,
  baseName: DECISION_COMPASS_STORE_NAME,
  emptyState: EMPTY_DECISION_COMPASS_STATE,
});
