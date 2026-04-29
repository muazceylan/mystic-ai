import { useCallback } from 'react';
import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { useNavigationHistoryStore } from '../store/useNavigationHistoryStore';
import {
  DEFAULT_FALLBACK_ROUTE,
  isRootTabPath,
  readOriginFromParams,
  resolveBackDestination,
  type NavigationOrigin,
} from '../navigation/navigationOrigin';
import {
  clearNavigationIntent,
  peekNavigationIntent,
} from '../navigation/navigationIntentStore';

export interface UseBackNavigationOptions {
  /**
   * Route to return to when there's no usable origin, stack, or history.
   * Defaults to `/(tabs)/home`.
   */
  fallbackRoute?: string;
  /**
   * Override the origin parsed from route params. Useful when the origin
   * comes from a different source (e.g. a store, or a parent screen).
   */
  overrideOrigin?: NavigationOrigin;
}

/**
 * Merge URL-param origin and intent-store origin. URL params win when present
 * because they survive refresh/remount; the intent store fills in the gaps
 * left by expo-router (tab switches, <Redirect> wrappers).
 */
function resolveEffectiveOrigin(
  fromParams: NavigationOrigin,
  fromIntent: NavigationOrigin | null,
): NavigationOrigin {
  if (!fromIntent) return fromParams;
  return {
    from: fromParams.from ?? fromIntent.from,
    originParams: fromParams.originParams ?? fromIntent.originParams,
    fallbackRoute: fromParams.fallbackRoute ?? fromIntent.fallbackRoute,
    entryType: fromParams.entryType ?? fromIntent.entryType,
  };
}

/**
 * Standard back behavior for detail/inner screens.
 *
 * Origin resolution prefers (in order):
 *   1. caller-supplied `overrideOrigin`
 *   2. URL search params (`from`, `entry_type`, …)
 *   3. in-memory intent store (reliable across tab switches + redirects)
 *
 * Back resolution then follows `resolveBackDestination`: origin → root-tab
 * previous-first exception → stack → previous → last tab → fallback.
 *
 * The returned callback is stable across renders for the same dependencies.
 */
export function useBackNavigation(options?: UseBackNavigationOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams() as Record<string, string | string[] | undefined>;
  const previousPath = useNavigationHistoryStore((s) => s.previousPath);
  const lastTabPath = useNavigationHistoryStore((s) => s.lastTabPath);

  const fallbackRoute = options?.fallbackRoute ?? DEFAULT_FALLBACK_ROUTE;

  return useCallback(() => {
    const paramsOrigin = readOriginFromParams(params);
    const intent = peekNavigationIntent(pathname);
    const intentOrigin: NavigationOrigin | null = intent
      ? {
          from: intent.from || undefined,
          fallbackRoute: intent.fallbackRoute,
          entryType: intent.entryType,
          originParams: intent.originParams,
        }
      : null;
    const origin = options?.overrideOrigin ?? resolveEffectiveOrigin(paramsOrigin, intentOrigin);

    const decision = resolveBackDestination({
      pathname,
      origin,
      canGoBack: router.canGoBack(),
      previousPath,
      lastTabPath,
      fallbackRoute,
    });

    /**
     * Consume the intent once the user has actually gone back. If they come
     * back to this screen from a different origin later, a new intent will be
     * written by `navigateWithOrigin`; leaving the old one would mix origins.
     */
    clearNavigationIntent(pathname);

    switch (decision.kind) {
      case 'stack':
        router.back();
        return;
      case 'origin':
      case 'previous':
      case 'lastTab':
      case 'fallback': {
        /**
         * Tab destinations need `navigate`, not `replace`. `router.replace`
         * to a root tab path inside the expo-router Tabs is unreliable — it
         * often lands on the default tab (home) instead of the target tab.
         * `navigate` respects tab state and performs a clean tab jump.
         */
        if (isRootTabPath(decision.route)) {
          router.navigate(decision.route as never);
        } else {
          router.replace(decision.route as never);
        }
        return;
      }
    }
  }, [
    options?.overrideOrigin,
    params,
    pathname,
    previousPath,
    lastTabPath,
    router,
    fallbackRoute,
  ]);
}
