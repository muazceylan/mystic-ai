import { router as globalRouter, type Router } from 'expo-router';
import {
  buildOriginParams,
  resolveAliasedPath,
  type NavigationOrigin,
  type NavigationEntryType,
} from './navigationOrigin';
import { setNavigationIntent } from './navigationIntentStore';

type RouterLike = Pick<Router, 'push' | 'replace' | 'navigate'>;

export type NavigateMethod = 'push' | 'replace' | 'navigate';

export interface NavigateWithOriginArgs {
  /** Target pathname (expo-router string route). Query strings are stripped — pass extraParams instead. */
  pathname: string;
  /** Origin route (usually `/(tabs)/home`, `/(tabs)/discover`, etc.). */
  from?: string;
  /** Explicit fallback; defaults to the caller's `from` if not set. */
  fallbackRoute?: string;
  /** Entry type. Defaults to `in_app`. */
  entryType?: NavigationEntryType;
  /** Optional JSON-stringified params snapshot for round-trip restoration. */
  originParams?: string;
  /** Extra route params to merge alongside the origin metadata. */
  extraParams?: Record<string, string | number | boolean | undefined | null>;
  /** Navigation method. Defaults to `push`. */
  method?: NavigateMethod;
  /** Optional router instance (for tests / non-hook contexts). Defaults to the global expo-router `router`. */
  router?: RouterLike;
}

function sanitizeExtraParams(
  extra: NavigateWithOriginArgs['extraParams'],
): Record<string, string> {
  if (!extra) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(extra)) {
    if (value === undefined || value === null) continue;
    out[key] = typeof value === 'string' ? value : String(value);
  }
  return out;
}

/**
 * Stripped-down path — expo-router `{ pathname, params }` form does not accept
 * a query string inside `pathname`. If the caller passed one, we split it.
 */
function splitPathAndQuery(pathname: string): { path: string; queryParams: Record<string, string> } {
  const [path, query] = pathname.split('?');
  if (!query) return { path: path ?? pathname, queryParams: {} };
  const queryParams: Record<string, string> = {};
  for (const part of query.split('&')) {
    if (!part) continue;
    const eq = part.indexOf('=');
    if (eq === -1) {
      queryParams[decodeURIComponent(part)] = '';
    } else {
      const k = decodeURIComponent(part.slice(0, eq));
      const v = decodeURIComponent(part.slice(eq + 1));
      queryParams[k] = v;
    }
  }
  return { path: path ?? pathname, queryParams };
}

/**
 * Navigate to a screen while attaching navigation-origin metadata.
 *
 * Prefer this over calling `router.push(route)` directly when the destination
 * is a detail/inner screen that should know where the user came from.
 */
export function navigateWithOrigin(args: NavigateWithOriginArgs): void {
  const {
    pathname,
    from,
    fallbackRoute,
    entryType,
    originParams,
    extraParams,
    method = 'push',
    router = globalRouter,
  } = args;

  /**
   * Forward-resolve aliases: some source paths (`/transits-today`,
   * `/notifications`, etc.) are thin `<Redirect>` wrapper screens. Navigating
   * through them drops custom params because the redirect replaces the route
   * without forwarding `params`. Jumping straight to the canonical target
   * preserves `from` / `entry_type` on the real destination.
   */
  const resolvedPathname = resolveAliasedPath(pathname);
  const { path, queryParams } = splitPathAndQuery(resolvedPathname);

  const origin: NavigationOrigin = {
    from,
    fallbackRoute: fallbackRoute ?? from,
    entryType: entryType ?? (from ? 'in_app' : undefined),
    originParams,
  };

  /**
   * Also stash the intent in the in-memory store, keyed by the canonical
   * target path. This is the reliable source of truth when expo-router drops
   * params across tab switches or <Redirect> wrappers.
   */
  if (from || originParams || entryType) {
    setNavigationIntent(path, {
      from: from ?? '',
      fallbackRoute: origin.fallbackRoute,
      entryType: origin.entryType,
      originParams,
    });
  }

  const params = {
    ...queryParams,
    ...buildOriginParams(origin),
    ...sanitizeExtraParams(extraParams),
  };

  const hasParams = Object.keys(params).length > 0;
  const target = hasParams
    ? ({ pathname: path, params } as Parameters<Router['push']>[0])
    : (path as Parameters<Router['push']>[0]);

  if (method === 'replace') {
    router.replace(target as never);
  } else if (method === 'navigate') {
    router.navigate(target as never);
  } else {
    router.push(target as never);
  }
}
