import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';

interface DecisionCompassState {
  hiddenActivityKeys: string[];
  hiddenCategoryKeys: string[];
  focusInitialized: boolean;
  toggleHiddenActivity: (activityKey: string) => void;
  resetHiddenActivities: () => void;
  setHiddenActivities: (keys: string[]) => void;
  toggleHiddenCategory: (categoryKey: string) => void;
  setCategoryVisibility: (categoryKey: string, visible: boolean) => void;
  resetHiddenCategories: () => void;
  initFromFocusPoints: (userFocusPoint: string | undefined, allCategoryKeys: string[]) => void;
}

/** Map compass category groupKey substrings to user focus point IDs */
const CATEGORY_TO_FOCUS: Record<string, string[]> = {
  kariyer: ['career'],
  iş: ['career'],
  aşk: ['love'],
  ilişki: ['love'],
  partner: ['love'],
  para: ['money', 'finance'],
  finans: ['money', 'finance'],
  sağlık: ['health'],
  aile: ['family'],
  ruhani: ['spiritual'],
  maneviyat: ['spiritual'],
  güzellik: ['beauty'],
  bakım: ['beauty'],
  sosyal: ['social'],
  ev: ['home'],
};

function categoryMatchesFocus(categoryKey: string, focusIds: string[]): boolean {
  const lower = categoryKey.toLowerCase();
  for (const [keyword, focusMatches] of Object.entries(CATEGORY_TO_FOCUS)) {
    if (lower.includes(keyword)) {
      return focusMatches.some((f) => focusIds.includes(f));
    }
  }
  // If no keyword match, show by default
  return true;
}

export const useDecisionCompassStore = create<DecisionCompassState>()(
  persist(
    (set, get) => ({
      hiddenActivityKeys: [],
      hiddenCategoryKeys: [],
      focusInitialized: false,
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
      resetHiddenCategories: () => set({ hiddenCategoryKeys: [], focusInitialized: false }),
      initFromFocusPoints: (userFocusPoint, allCategoryKeys) => {
        if (get().focusInitialized) return;
        if (!userFocusPoint?.trim()) {
          set({ focusInitialized: true });
          return;
        }
        const focusIds = userFocusPoint.split(',').map((s) => s.trim().toLowerCase());
        const toHide = allCategoryKeys.filter((key) => !categoryMatchesFocus(key, focusIds));
        set({ hiddenCategoryKeys: toHide, focusInitialized: true });
      },
    }),
    {
      name: 'decision-compass-store',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
