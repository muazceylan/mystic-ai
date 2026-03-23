import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

export type AppEnv = 'dev' | 'stage' | 'prod';
export type AnalyticsProvider = 'none' | 'amplitude';

type EnvSource = string | undefined;

const API_GATEWAY_PORT = 8080;
const WEB_FALLBACK_HOST = 'localhost';
const IOS_FALLBACK_HOST = 'localhost';
const ANDROID_EMULATOR_HOST = '10.0.2.2';
const INVALID_DEV_HOSTS = new Set(['', '0.0.0.0', '::', '[::]']);

function normalizeEnv(value: EnvSource): AppEnv {
  const token = (value ?? '').trim().toLowerCase();
  if (token === 'prod' || token === 'production') return 'prod';
  if (token === 'stage' || token === 'staging' || token === 'preview') return 'stage';
  return 'dev';
}

function asBool(value: EnvSource): boolean {
  return (value ?? '').trim().toLowerCase() === 'true';
}

function normalizeAnalyticsProvider(value: EnvSource): AnalyticsProvider {
  const token = (value ?? '').trim().toLowerCase();
  if (token === 'amplitude') return 'amplitude';
  return 'none';
}

function normalizeBaseUrl(value: EnvSource | null): string | null {
  const raw = (value ?? '').trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, '');
}

function buildHttpUrl(host: string, port: number): string {
  return `http://${host}:${port}`;
}

function getDefaultDevHost(): string {
  return Platform.OS === 'android' ? ANDROID_EMULATOR_HOST : IOS_FALLBACK_HOST;
}

function normalizeHostCandidate(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim();
  if (!raw) return null;

  const normalized = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(raw) ? raw : `http://${raw}`;

  try {
    const candidate = new URL(normalized).hostname.trim();
    if (candidate && !INVALID_DEV_HOSTS.has(candidate)) {
      return candidate;
    }
  } catch {
    // Fall through to manual parsing below.
  }

  const stripped = raw
    .replace(/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//, '')
    .replace(/^\/+/, '')
    .split(/[/?#]/, 1)[0]
    ?.split(':', 1)[0]
    ?.trim();

  if (!stripped || INVALID_DEV_HOSTS.has(stripped)) {
    return null;
  }

  return stripped;
}

function resolveWebHost(): string {
  if (typeof window === 'undefined') {
    return WEB_FALLBACK_HOST;
  }

  return normalizeHostCandidate(window.location.hostname) ?? WEB_FALLBACK_HOST;
}

function resolveExpoMetroHost(): string | null {
  const hostCandidates: Array<string | null | undefined> = [
    Constants.expoConfig?.hostUri,
    (Constants.manifest2 as { extra?: { expoClient?: { hostUri?: string } } } | null)?.extra?.expoClient?.hostUri,
    (Constants.expoGoConfig as { debuggerHost?: string } | null)?.debuggerHost,
    Constants.linkingUri,
    Constants.experienceUrl,
    (NativeModules as { SourceCode?: { scriptURL?: string } }).SourceCode?.scriptURL,
  ];

  for (const candidate of hostCandidates) {
    const host = normalizeHostCandidate(candidate);
    if (host) {
      return host;
    }
  }

  return null;
}

function getIsPhysicalDevice(): boolean | null {
  const maybeIsDevice = (Constants as { isDevice?: boolean }).isDevice;
  if (typeof maybeIsDevice === 'boolean') {
    return maybeIsDevice;
  }
  return null;
}

export function resolveDevBaseUrl(port: number, explicitOverride?: string | null): string {
  const override = normalizeBaseUrl(explicitOverride);
  if (override) {
    return override;
  }

  if (Platform.OS === 'web') {
    return buildHttpUrl(resolveWebHost(), port);
  }

  const metroHost = resolveExpoMetroHost();
  if (metroHost) {
    return buildHttpUrl(metroHost, port);
  }

  const isPhysicalDevice = getIsPhysicalDevice();
  if (isPhysicalDevice === false) {
    return buildHttpUrl(getDefaultDevHost(), port);
  }

  const fallbackUrl = buildHttpUrl(getDefaultDevHost(), port);

  if (__DEV__) {
    console.warn(
      `[env] Expo dev host could not be resolved on device. Falling back to ${fallbackUrl}. ` +
        'Set EXPO_PUBLIC_API_BASE_URL_DEV_OVERRIDE if you need a manual override.'
    );
  }

  return fallbackUrl;
}

const requestedEnv = normalizeEnv(process.env.EXPO_PUBLIC_APP_ENV ?? process.env.APP_ENV);
const appEnv: AppEnv = __DEV__ ? requestedEnv : requestedEnv === 'dev' ? 'prod' : requestedEnv;
const devBaseUrlOverride = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL_DEV_OVERRIDE);
const legacyDevBaseUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL_DEV);
const stageBaseUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL_STAGE);
const prodBaseUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL_PROD);
const legacyBaseUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);

function resolveConfiguredBaseUrl(): string | null {
  if (appEnv === 'stage') {
    return stageBaseUrl ?? legacyBaseUrl;
  }

  if (appEnv === 'prod') {
    return prodBaseUrl ?? legacyBaseUrl;
  }

  return resolveDevBaseUrl(API_GATEWAY_PORT, devBaseUrlOverride ?? legacyDevBaseUrl ?? legacyBaseUrl);
}

const resolvedBaseUrl = resolveConfiguredBaseUrl();

const mockRequested = asBool(process.env.EXPO_PUBLIC_USE_MOCK ?? process.env.USE_MOCK);
const mockEnabled = __DEV__ && appEnv !== 'prod' && mockRequested;

const analyticsApiKey = (process.env.EXPO_PUBLIC_ANALYTICS_API_KEY ?? '').trim();
const analyticsProviderRaw = normalizeAnalyticsProvider(process.env.EXPO_PUBLIC_ANALYTICS_PROVIDER);
const analyticsProvider = analyticsProviderRaw === 'none' && analyticsApiKey ? 'amplitude' : analyticsProviderRaw;
const analyticsEndpoint = (process.env.EXPO_PUBLIC_ANALYTICS_ENDPOINT ?? 'https://api2.amplitude.com/2/httpapi')
  .trim();
const analyticsEnabled = analyticsProvider !== 'none' && Boolean(analyticsApiKey);
const analyticsDebug = asBool(process.env.EXPO_PUBLIC_ANALYTICS_DEBUG) || __DEV__;

const premiumFeaturesEnabled = asBool(process.env.EXPO_PUBLIC_PREMIUM_FEATURES_ENABLED);
const numerologyForceUnlockAllSections = asBool(process.env.EXPO_PUBLIC_NUMEROLOGY_FORCE_UNLOCK_ALL)
  || !premiumFeaturesEnabled;

// ── AdMob ────────────────────────────────────────────────────────────
const admobUseTestIds = asBool(process.env.EXPO_PUBLIC_ADMOB_USE_TEST_IDS) || __DEV__;
const admobAndroidRewardedUnitId = (process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_UNIT_ID ?? '').trim();
const admobIosRewardedUnitId = (process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_UNIT_ID ?? '').trim();

export const envConfig = {
  appEnv,
  apiBaseUrl: resolvedBaseUrl,
  isProduction: appEnv === 'prod',
  isApiConfigured: Boolean(resolvedBaseUrl),
  mockEnabled,
  requiredHeaders: ['X-User-Id'] as const,
  analytics: {
    provider: analyticsProvider,
    apiKey: analyticsApiKey,
    endpoint: analyticsEndpoint,
    enabled: analyticsEnabled,
    debug: analyticsDebug,
  },
  features: {
    premiumFeaturesEnabled,
    numerologyForceUnlockAllSections,
  },
  admob: {
    useTestIds: admobUseTestIds,
    androidRewardedUnitId: admobAndroidRewardedUnitId,
    iosRewardedUnitId: admobIosRewardedUnitId,
  },
} as const;
