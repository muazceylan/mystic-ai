/**
 * Navigation origin model.
 *
 * Purpose: when a card/list/CTA navigates to a detail screen, we want the
 * detail's "back" action to return the user to the actual entry surface —
 * not to whatever the stack happens to hold.
 *
 * Keys are URL-safe strings (not nested objects), so they round-trip through
 * expo-router `params` without any serialization pitfalls.
 *
 * Param key names are kept short + snake_case to look sensible in deep link
 * URLs (e.g. `/numerology?from=/(tabs)/discover&entry_type=in_app`).
 *
 * NOTE: The `from` key is pre-existing in the codebase (discover.tsx and
 * useSmartBackNavigation already read it). We keep it as the canonical key
 * for the origin route to avoid breaking anything.
 */
export type NavigationEntryType =
  | 'in_app'
  | 'deeplink'
  | 'push'
  | 'modal'
  | 'external';

export interface NavigationOrigin {
  /** Absolute pathname of the screen the user was on when they triggered navigation. */
  from?: string;
  /** Optional JSON-stringified params snapshot for the origin screen, so list filters / scroll positions can be restored on back. */
  originParams?: string;
  /** Explicit fallback route if stack is empty and origin is missing. */
  fallbackRoute?: string;
  /** How the user entered this screen. Affects back resolution (push/deeplink skip the stack). */
  entryType?: NavigationEntryType;
}

export const NAV_PARAM_KEYS = {
  FROM: 'from',
  ORIGIN_PARAMS: 'origin_params',
  FALLBACK_ROUTE: 'fallback_route',
  ENTRY_TYPE: 'entry_type',
} as const;

export const DEFAULT_FALLBACK_ROUTE = '/(tabs)/home' as const;

/**
 * Tabs that count as "root surfaces" — used by history store + back resolution.
 *
 * Values are stored WITHOUT route group segments because `usePathname()` in
 * expo-router returns paths with groups stripped (e.g. `/(tabs)/calendar` →
 * `/calendar`). All comparisons go through `normalizeComparablePath` which
 * strips groups, so callers can pass either form.
 */
export const ROOT_TAB_PATHS: ReadonlyArray<string> = [
  '/home',
  '/discover',
  '/calendar',
  '/natal-chart',
  '/profile',
];

/**
 * Known auth/onboarding surfaces. Used to prevent the back resolver from
 * returning users to an auth screen. Stored in their stripped form because
 * that's what `usePathname()` reports at runtime.
 */
const AUTH_SURFACES: ReadonlySet<string> = new Set([
  '/welcome',
  '/signup',
  '/email-register',
  '/verify-email',
  '/verify-email-pending',
  '/forgot-password',
  '/oauth2',
  '/guest-name',
  '/birth-date',
  '/birth-time',
  '/birth-country',
  '/birth-city',
  '/gender',
  '/marital-status',
  '/notification-permission',
]);

/**
 * Strip route group segments (`/(tabs)`, `/(auth)`, …) from a path.
 * Mirrors what expo-router does internally for `usePathname()`.
 */
function stripRouteGroups(path: string): string {
  const stripped = path.replace(/\/\([^)]+\)/g, '');
  return stripped.length === 0 ? '/' : stripped;
}

/**
 * Aliases: `<Redirect>` wrapper routes → real target.
 *
 * These source paths exist as thin `<Redirect href=... />` files under `src/app`.
 * When navigating through them, expo-router's internal replace drops any custom
 * params we attached — so `from` / `entry_type` never reach the real target.
 *
 * `navigateWithOrigin` forward-resolves these before pushing so the target
 * receives our params directly. `normalizeComparablePath` also uses this map
 * so same-path comparisons treat the redirect wrapper and its target as equal.
 */
export const PATH_ALIASES: Record<string, string> = {
  '/decision-compass': '/(tabs)/decision-compass-tab',
  '/transits-today': '/(tabs)/daily-transits',
  '/notifications': '/(tabs)/notifications',
  '/notifications-settings': '/(tabs)/notifications-settings',
  '/theme-settings': '/(tabs)/theme-settings',
};

/**
 * Resolve an alias source path to its canonical target.
 * Safe for any path — non-aliased paths return unchanged.
 * Strips a trailing slash and query string before lookup.
 */
export function resolveAliasedPath(pathname: string): string {
  const [path, query] = pathname.split('?');
  const cleanPath = path ?? pathname;
  const trimmed = cleanPath.length > 1 && cleanPath.endsWith('/')
    ? cleanPath.slice(0, -1)
    : cleanPath;
  const target = PATH_ALIASES[trimmed];
  if (!target) return pathname;
  return query ? `${target}?${query}` : target;
}

export function isRootTabPath(path: string | null | undefined): boolean {
  const normalized = normalizeComparablePath(path);
  if (!normalized) return false;
  // `ROOT_TAB_PATHS` is stored in stripped form (matches `usePathname()` output).
  // `normalizeComparablePath` strips groups too, so both forms converge.
  return ROOT_TAB_PATHS.includes(normalized);
}

const VALID_ENTRY_TYPES: ReadonlySet<NavigationEntryType> = new Set([
  'in_app',
  'deeplink',
  'push',
  'modal',
  'external',
]);

function firstString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * Normalize a path for equality comparison.
 *
 * - Drops query string and hash.
 * - Ensures a leading slash.
 * - Strips a trailing slash.
 * - Resolves redirect wrapper aliases (`/transits-today` → `/daily-transits`).
 * - Strips route group segments (`/(tabs)`, `/(auth)`) so comparisons work
 *   regardless of whether the caller passed the "raw" expo-router form or the
 *   "canonical" URL form that `usePathname()` actually reports.
 *
 * This is the single canonical form used for intent-store keys, root-tab
 * detection, and same-path guards in the resolver.
 */
export function normalizeComparablePath(path: string | null | undefined): string | null {
  if (!path || typeof path !== 'string') return null;
  const clean = path.split('?')[0]?.split('#')[0] ?? '';
  if (!clean) return null;
  let normalized = clean.startsWith('/') ? clean : `/${clean}`;
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  const aliasTarget = PATH_ALIASES[normalized];
  const afterAlias = aliasTarget ?? normalized;
  return stripRouteGroups(afterAlias);
}

/**
 * Is this path a known auth/onboarding surface?
 * Used by the resolver to never return users to an auth screen via "previous"
 * or "origin" paths.
 */
export function isAuthSurfacePath(path: string | null | undefined): boolean {
  const normalized = normalizeComparablePath(path);
  if (!normalized) return false;
  if (AUTH_SURFACES.has(normalized)) return true;
  // Also catch auth nested routes like `/oauth2/callback`.
  return Array.from(AUTH_SURFACES).some(
    (surface) => normalized.startsWith(`${surface}/`),
  );
}

/** Validate an origin route string — must be a real in-app path. */
export function isValidOriginRoute(route: unknown): route is string {
  if (typeof route !== 'string') return false;
  if (!route.startsWith('/')) return false;
  // Don't return users to auth/onboarding as an origin.
  if (isAuthSurfacePath(route)) return false;
  return true;
}

/**
 * Build expo-router params from a NavigationOrigin. Returns a flat record so
 * callers can spread it straight into `router.push({ pathname, params })`.
 *
 * Undefined fields are omitted (keeps URLs clean).
 */
export function buildOriginParams(origin: NavigationOrigin): Record<string, string> {
  const out: Record<string, string> = {};
  if (isValidOriginRoute(origin.from)) {
    out[NAV_PARAM_KEYS.FROM] = origin.from;
  }
  if (typeof origin.originParams === 'string' && origin.originParams.length > 0) {
    out[NAV_PARAM_KEYS.ORIGIN_PARAMS] = origin.originParams;
  }
  if (isValidOriginRoute(origin.fallbackRoute)) {
    out[NAV_PARAM_KEYS.FALLBACK_ROUTE] = origin.fallbackRoute;
  }
  if (origin.entryType && VALID_ENTRY_TYPES.has(origin.entryType)) {
    out[NAV_PARAM_KEYS.ENTRY_TYPE] = origin.entryType;
  }
  return out;
}

/**
 * Read NavigationOrigin back from a params record (e.g. the output of
 * `useLocalSearchParams`). Values that fail validation are dropped.
 */
export function readOriginFromParams(
  params: Record<string, string | string[] | undefined> | undefined | null,
): NavigationOrigin {
  if (!params) return {};
  const from = firstString(params[NAV_PARAM_KEYS.FROM]);
  const originParams = firstString(params[NAV_PARAM_KEYS.ORIGIN_PARAMS]);
  const fallbackRoute = firstString(params[NAV_PARAM_KEYS.FALLBACK_ROUTE]);
  const entryTypeRaw = firstString(params[NAV_PARAM_KEYS.ENTRY_TYPE]);
  const entryType =
    entryTypeRaw && VALID_ENTRY_TYPES.has(entryTypeRaw as NavigationEntryType)
      ? (entryTypeRaw as NavigationEntryType)
      : undefined;

  return {
    from: isValidOriginRoute(from) ? from : undefined,
    originParams: originParams && originParams.length > 0 ? originParams : undefined,
    fallbackRoute: isValidOriginRoute(fallbackRoute) ? fallbackRoute : undefined,
    entryType,
  };
}

export type BackResolution =
  | { kind: 'origin'; route: string; originParams?: string }
  | { kind: 'stack' }
  | { kind: 'previous'; route: string }
  | { kind: 'lastTab'; route: string }
  | { kind: 'fallback'; route: string };

export interface ResolveBackInput {
  /** Current pathname. */
  pathname: string | null | undefined;
  /** Origin parsed from route params. */
  origin: NavigationOrigin;
  /** Whether the stack can go back (from `router.canGoBack()`). */
  canGoBack: boolean;
  /** Previous path from the history store. */
  previousPath: string | null | undefined;
  /** Last tab path from the history store. */
  lastTabPath: string | null | undefined;
  /** Fallback route to use if nothing else matches. */
  fallbackRoute?: string;
}

/**
 * Pure resolver for back navigation. Returns a descriptor of WHERE to go;
 * the hook/component layer is responsible for calling router methods.
 *
 * Resolution order:
 *   1. Push / deeplink entry with NO explicit origin → jump straight to fallback.
 *      (Stack is untrustworthy for cold-start deep links.)
 *   2. Explicit origin param → replace to origin.
 *   3. Router stack has history → back().
 *   4. History store has a usable previous path → replace.
 *   5. Last visited root tab → replace.
 *   6. Configured fallback → replace.
 */
export function resolveBackDestination(input: ResolveBackInput): BackResolution {
  const { pathname, origin, canGoBack, previousPath, lastTabPath } = input;
  const normalizedPathname = normalizeComparablePath(pathname);
  const fallback = isValidOriginRoute(origin.fallbackRoute)
    ? origin.fallbackRoute
    : isValidOriginRoute(input.fallbackRoute)
      ? input.fallbackRoute
      : DEFAULT_FALLBACK_ROUTE;

  const enteredFromOutside = origin.entryType === 'push' || origin.entryType === 'deeplink';

  if (enteredFromOutside && !origin.from) {
    return { kind: 'fallback', route: fallback };
  }

  if (origin.from && normalizeComparablePath(origin.from) !== normalizedPathname) {
    return { kind: 'origin', route: origin.from, originParams: origin.originParams };
  }

  const normalizedPrev = normalizeComparablePath(previousPath);
  const previousIsUsable =
    !!previousPath &&
    !!normalizedPrev &&
    normalizedPrev !== normalizedPathname &&
    !isAuthSurfacePath(previousPath);

  /**
   * Root tab exception: when we're on a tab root (home, discover, calendar,
   * natal-chart, profile) and no origin was preserved (expo-router does not
   * carry custom params across tab switches), `router.back()` can pop to the
   * tab navigator's default (often home) rather than the actual previous
   * surface. Prefer the history store's previousPath in that case.
   */
  if (!origin.from && isRootTabPath(pathname) && previousIsUsable) {
    return { kind: 'previous', route: previousPath as string };
  }

  if (canGoBack) {
    return { kind: 'stack' };
  }

  if (previousIsUsable) {
    return { kind: 'previous', route: previousPath as string };
  }

  const normalizedLastTab = normalizeComparablePath(lastTabPath);
  if (
    lastTabPath &&
    normalizedLastTab &&
    normalizedLastTab !== normalizedPathname
  ) {
    return { kind: 'lastTab', route: lastTabPath };
  }

  return { kind: 'fallback', route: fallback };
}
