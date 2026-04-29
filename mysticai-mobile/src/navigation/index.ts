export {
  DEFAULT_FALLBACK_ROUTE,
  NAV_PARAM_KEYS,
  PATH_ALIASES,
  ROOT_TAB_PATHS,
  buildOriginParams,
  isRootTabPath,
  isValidOriginRoute,
  normalizeComparablePath,
  readOriginFromParams,
  resolveAliasedPath,
  resolveBackDestination,
  type BackResolution,
  type NavigationEntryType,
  type NavigationOrigin,
  type ResolveBackInput,
} from './navigationOrigin';

export { navigateWithOrigin, type NavigateMethod, type NavigateWithOriginArgs } from './navigateWithOrigin';
export { performSmartBack, type PerformSmartBackOptions } from './smartBack';
