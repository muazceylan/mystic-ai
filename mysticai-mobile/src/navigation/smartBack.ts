import { router } from 'expo-router';
import { useNavigationHistoryStore } from '../store/useNavigationHistoryStore';
import {
  DEFAULT_FALLBACK_ROUTE,
  isRootTabPath,
  resolveBackDestination,
  type NavigationOrigin,
} from './navigationOrigin';
import {
  clearNavigationIntent,
  peekNavigationIntent,
} from './navigationIntentStore';

export interface PerformSmartBackOptions {
  /** Explicit fallback route; defaults to `/(tabs)/home`. */
  fallbackRoute?: string;
  /**
   * Explicit current pathname. Useful in rare cases where the hook's
   * `usePathname()` isn't available. Defaults to the history store's current
   * path.
   */
  pathname?: string | null;
}

/**
 * Non-hook smart back. Drop-in replacement for `router.back()` that honors
 * the navigation intent store + history store + alias normalization.
 *
 * Prefer `useBackNavigation()` when you have hook context (it also reads
 * URL `?from=` params). Use this when you need a one-liner:
 *
 *     <Pressable onPress={performSmartBack}>
 *
 * Consumes the current screen's intent as a side-effect so stale entries
 * don't linger across re-entries.
 */
export function performSmartBack(options?: PerformSmartBackOptions): void {
  const { fallbackRoute = DEFAULT_FALLBACK_ROUTE } = options ?? {};
  const historyState = useNavigationHistoryStore.getState();
  const pathname = options?.pathname ?? historyState.currentPath ?? null;

  const intent = peekNavigationIntent(pathname);
  const intentOrigin: NavigationOrigin = intent
    ? {
        from: intent.from || undefined,
        fallbackRoute: intent.fallbackRoute,
        entryType: intent.entryType,
        originParams: intent.originParams,
      }
    : {};

  const decision = resolveBackDestination({
    pathname,
    origin: intentOrigin,
    canGoBack: router.canGoBack(),
    previousPath: historyState.previousPath,
    lastTabPath: historyState.lastTabPath,
    fallbackRoute,
  });

  clearNavigationIntent(pathname);

  switch (decision.kind) {
    case 'stack':
      router.back();
      return;
    case 'origin':
    case 'previous':
    case 'lastTab':
    case 'fallback':
      if (isRootTabPath(decision.route)) {
        router.navigate(decision.route as never);
      } else {
        router.replace(decision.route as never);
      }
      return;
  }
}
