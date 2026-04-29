import { create } from 'zustand';
import {
  normalizeComparablePath,
  ROOT_TAB_PATHS,
} from '../navigation/navigationOrigin';

type NavigationHistoryState = {
  currentPath: string | null;
  previousPath: string | null;
  lastTabPath: string | null;
  updatePath: (path: string) => void;
  reset: () => void;
};

const ROOT_TAB_SET = new Set(ROOT_TAB_PATHS);

function normalizePathForStorage(path: string): string {
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
}

export const useNavigationHistoryStore = create<NavigationHistoryState>((set, get) => ({
  currentPath: null,
  previousPath: null,
  lastTabPath: null,
  updatePath: (rawPath: string) => {
    const nextPath = normalizePathForStorage(rawPath);
    const { currentPath } = get();
    if (currentPath === nextPath) return;
    // Root-tab detection uses the group-stripped canonical form so it works
    // regardless of whether the runtime pathname includes `(tabs)` or not.
    const comparable = normalizeComparablePath(nextPath);
    const shouldTrackAsLastTab = !!comparable && ROOT_TAB_SET.has(comparable);
    set({
      previousPath: currentPath,
      currentPath: nextPath,
      ...(shouldTrackAsLastTab ? { lastTabPath: nextPath } : {}),
    });
  },
  reset: () => set({ currentPath: null, previousPath: null, lastTabPath: null }),
}));
