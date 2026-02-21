import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { PlannerCategoryId } from '../features/planner/plannerEngine';
import { zustandStorage } from '../utils/storage';

interface PlannerPreferencesState {
  hiddenCategoryIds: PlannerCategoryId[];
  toggleCategoryVisibility: (categoryId: PlannerCategoryId) => void;
  setCategoryVisibility: (categoryId: PlannerCategoryId, visible: boolean) => void;
  reset: () => void;
}

export const usePlannerPreferencesStore = create<PlannerPreferencesState>()(
  persist(
    (set, get) => ({
      hiddenCategoryIds: [],
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
      name: 'planner-preferences',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
