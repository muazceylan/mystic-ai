import { create } from 'zustand';

type NavigationHistoryState = {
  currentPath: string | null;
  previousPath: string | null;
  lastTabPath: string | null;
  updatePath: (path: string) => void;
  reset: () => void;
};

const ROOT_TAB_PATHS = new Set([
  '/(tabs)/home',
  '/(tabs)/discover',
  '/(tabs)/calendar',
  '/(tabs)/natal-chart',
  '/(tabs)/profile',
]);

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
    const shouldTrackAsLastTab = ROOT_TAB_PATHS.has(nextPath);
    set({
      previousPath: currentPath,
      currentPath: nextPath,
      ...(shouldTrackAsLastTab ? { lastTabPath: nextPath } : {}),
    });
  },
  reset: () => set({ currentPath: null, previousPath: null, lastTabPath: null }),
}));
