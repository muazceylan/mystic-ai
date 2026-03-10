import { create } from 'zustand';

type NavigationHistoryState = {
  currentPath: string | null;
  previousPath: string | null;
  lastTabPath: string | null;
  updatePath: (path: string) => void;
  reset: () => void;
};

function normalizePath(path: string): string {
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
}

export const useNavigationHistoryStore = create<NavigationHistoryState>((set, get) => ({
  currentPath: null,
  previousPath: null,
  lastTabPath: null,
  updatePath: (rawPath: string) => {
    const nextPath = normalizePath(rawPath);
    const { currentPath } = get();
    if (currentPath === nextPath) return;
    const isTabPath = nextPath.startsWith('/(tabs)/');
    const shouldTrackAsLastTab = isTabPath && nextPath !== '/(tabs)/decision-compass-tab';
    set({
      previousPath: currentPath,
      currentPath: nextPath,
      ...(shouldTrackAsLastTab ? { lastTabPath: nextPath } : {}),
    });
  },
  reset: () => set({ currentPath: null, previousPath: null, lastTabPath: null }),
}));
