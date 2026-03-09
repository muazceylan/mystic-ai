import { Platform } from 'react-native';

export type AppEnv = 'dev' | 'stage' | 'prod';
export type AnalyticsProvider = 'none' | 'amplitude';

type EnvSource = string | undefined;

const DEFAULT_DEV_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';

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

function normalizeBaseUrl(value: EnvSource): string | null {
  const raw = (value ?? '').trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, '');
}

const requestedEnv = normalizeEnv(process.env.EXPO_PUBLIC_APP_ENV ?? process.env.APP_ENV);
const appEnv: AppEnv = __DEV__ ? requestedEnv : requestedEnv === 'dev' ? 'prod' : requestedEnv;

const baseUrlByEnv: Record<AppEnv, string | null> = {
  dev: normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL_DEV),
  stage: normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL_STAGE),
  prod: normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL_PROD),
};

const legacyBaseUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
const resolvedBaseUrl =
  baseUrlByEnv[appEnv] ?? legacyBaseUrl ?? (appEnv === 'dev' ? DEFAULT_DEV_BASE_URL : null);

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
} as const;
