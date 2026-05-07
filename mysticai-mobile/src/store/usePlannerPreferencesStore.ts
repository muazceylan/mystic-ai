import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { PlannerCategoryId } from '../features/planner/plannerEngine';
import { zustandStorage } from '../utils/storage';
import { bindUserScopedPersist, getInitialUserScopedStoreName } from './userScopedPersist';

interface PlannerPreferencesState {
  hiddenCategoryIds: PlannerCategoryId[];
  toggleCategoryVisibility: (categoryId: PlannerCategoryId) => void;
  setCategoryVisibility: (categoryId: PlannerCategoryId, visible: boolean) => void;
  reset: () => void;
}

const PLANNER_PREFERENCES_STORE_NAME = 'planner-preferences';
const EMPTY_PLANNER_PREFERENCES_STATE: Pick<PlannerPreferencesState, 'hiddenCategoryIds'> = {
  hiddenCategoryIds: [],
};

export const usePlannerPreferencesStore = create<PlannerPreferencesState>()(
  persist(
    (set, get) => ({
      ...EMPTY_PLANNER_PREFERENCES_STATE,
      toggleCategoryVisibility: (categoryId) => {
        const hidden = get().hiddenCategoryIds;
        const alreadyHidden = hidden.includes(categoryId);
        if (alreadyHidden) {
          set({ hiddenCategoryIds: hidden.filter((id) => id !== categoryId) });
        } else {
          set({ hiddenCategoryIds: [...hidden, categoryId] });
        }
      },
      setCategoryVisibility: (categoryId, visible) => {
        const hidden = get().hiddenCategoryIds;
        if (visible) {
          set({ hiddenCategoryIds: hidden.filter((id) => id !== categoryId) });
          return;
        }
        if (!hidden.includes(categoryId)) {
          set({ hiddenCategoryIds: [...hidden, categoryId] });
        }
      },
      reset: () => set({ hiddenCategoryIds: [] }),
    }),
    {
      name: getInitialUserScopedStoreName(PLANNER_PREFERENCES_STORE_NAME),
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);

bindUserScopedPersist({
  store: usePlannerPreferencesStore,
  baseName: PLANNER_PREFERENCES_STORE_NAME,
  emptyState: EMPTY_PLANNER_PREFERENCES_STATE,
});
