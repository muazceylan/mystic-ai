import { useCallback } from 'react';
import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { useNavigationHistoryStore } from '../store/useNavigationHistoryStore';

type SmartBackOptions = {
  fallbackRoute?: string;
  preferLastTabPath?: boolean;
  preferFromParam?: boolean;
};

const PATH_ALIASES: Record<string, string> = {
  '/decision-compass': '/(tabs)/decision-compass-tab',
  '/transits-today': '/(tabs)/daily-transits',
};

function defaultFallback(pathname: string): string {
  void pathname;
  return '/(tabs)/home';
}

function normalizeComparablePath(path: string | null | undefined): string | null {
  if (!path || typeof path !== 'string') return null;
  const clean = path.split('?')[0]?.split('#')[0] ?? '';
  if (!clean) return null;
  let normalized = clean.startsWith('/') ? clean : `/${clean}`;
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return PATH_ALIASES[normalized] ?? normalized;
}

/**
 * Standard back behavior for inner/detail screens:
 * - If stack has history: go back to the previous screen.
 * - If opened directly (deep link / cold entry): use a controlled fallback.
 */
export function useSmartBackNavigation(options?: SmartBackOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ from?: string | string[] }>();
  const previousPath = useNavigationHistoryStore((s) => s.previousPath);
  const lastTabPath = useNavigationHistoryStore((s) => s.lastTabPath);

  return useCallback(() => {
    const fromParam = Array.isArray(params.from) ? params.from[0] : params.from;
    const normalizedPathname = normalizeComparablePath(pathname);
    const normalizedFrom = normalizeComparablePath(fromParam);
    const normalizedPrevious = normalizeComparablePath(previousPath);
    const normalizedLastTab = normalizeComparablePath(lastTabPath);

    const shouldPreferFromBeforeStack = options?.preferFromParam === true
      || (options?.preferFromParam !== false && !!options?.preferLastTabPath);

    if (
      shouldPreferFromBeforeStack
      && typeof fromParam === 'string'
      && fromParam.startsWith('/')
      && normalizedFrom
      && normalizedFrom !== normalizedPathname
    ) {
      router.replace(fromParam as never);
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (
      normalizedPrevious
      && normalizedPrevious !== normalizedPathname
      && previousPath
      && !normalizedPrevious.startsWith('/(auth)')
    ) {
      router.replace(previousPath as never);
      return;
    }

    if (options?.preferLastTabPath && normalizedLastTab && normalizedLastTab !== normalizedPathname && lastTabPath) {
      router.replace(lastTabPath as never);
      return;
    }

    router.replace((options?.fallbackRoute ?? defaultFallback(pathname)) as never);
  }, [
    lastTabPath,
    options?.fallbackRoute,
    options?.preferFromParam,
    options?.preferLastTabPath,
    params.from,
    pathname,
    previousPath,
    router,
  ]);
}
