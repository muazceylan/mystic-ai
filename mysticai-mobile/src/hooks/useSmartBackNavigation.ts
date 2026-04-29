import { useBackNavigation, type UseBackNavigationOptions } from './useBackNavigation';

/**
 * Back-compat alias for `useBackNavigation`.
 *
 * Historically this hook accepted `preferFromParam` / `preferLastTabPath`
 * flags. Both behaviors are now the default (origin param is always honored
 * when present; last tab is always used as a fallback when nothing else
 * matches), so those flags are no longer necessary.
 *
 * Existing call sites keep working unchanged — unknown options are ignored.
 */
type LegacyOptions = UseBackNavigationOptions & {
  /** @deprecated Origin param is always honored when present. */
  preferFromParam?: boolean;
  /** @deprecated Last tab is always tried as a fallback. */
  preferLastTabPath?: boolean;
};

export function useSmartBackNavigation(options?: LegacyOptions) {
  return useBackNavigation(options);
}
