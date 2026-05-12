import axios from 'axios/dist/browser/axios.cjs';
import type { AxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { getToken } from '../utils/storage';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigationHistoryStore } from '../store/useNavigationHistoryStore';
import { envConfig } from '../config/env';
import i18n from '../i18n';
import {
  createServiceNotConfiguredError,
  logApiError,
  logWarnOnce,
} from './observability';
import {
  sanitizeAmplitudeContextPath,
  sanitizeAmplitudeErrorMessage,
} from './amplitudeSanitization';
import { ProductEventName, trackProductEvent } from './productAnalytics';

// Extend AxiosRequestConfig (default data type = any) so the helper's return
// value is structurally accepted as the 3rd arg to axios.post/put/delete<D>
// without forcing every call site to specialize the data generic.
type ApiRequestConfig<Data = unknown> = AxiosRequestConfig<Data> & {
  suppressGlobalErrorLog?: boolean;
};

const api = axios.create({
  baseURL: envConfig.apiBaseUrl ?? undefined,
  timeout: 15000,
});

function toHeaderUserId(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return String(Math.trunc(value));
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return /^\d+$/.test(trimmed) ? trimmed : null;
  }

  return null;
}

function resolveRequestLocale(preferredLanguage?: string | null): 'tr' | 'en' {
  const source = i18n.resolvedLanguage ?? i18n.language ?? preferredLanguage ?? 'tr';
  return source.toLowerCase().startsWith('en') ? 'en' : 'tr';
}

function shouldSuppressGlobalErrorLog(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('config' in error)) {
    return false;
  }

  return Boolean((error.config as ApiRequestConfig | undefined)?.suppressGlobalErrorLog);
}

function isRetryableStatus(status?: number): boolean {
  if (!status) {
    return true;
  }

  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function buildSanitizedErrorContext(method: string, url: string): string {
  return `${method} ${sanitizeAmplitudeContextPath(url)}`;
}

export function withSuppressedGlobalApiErrorLog<Data = unknown>(
  config?: AxiosRequestConfig<Data>,
): ApiRequestConfig<Data> {
  return {
    ...(config ?? {}),
    suppressGlobalErrorLog: true,
  };
}

// Attach token to every request
api.interceptors.request.use(async (config: any) => {
  if (!envConfig.isApiConfigured) {
    logWarnOnce(
      'api',
      'service_not_configured',
      'API base URL missing. Requests are blocked and screens should show empty/error states.',
      { appEnv: envConfig.appEnv },
    );
    throw createServiceNotConfiguredError('api');
  }

  const token = await getToken();
  const authState = useAuthStore.getState();
  const userIdHeader = toHeaderUserId(authState.user?.id);
  const usernameHeader = authState.user?.username?.trim() || undefined;
  const localeHeader = resolveRequestLocale(authState.user?.preferredLanguage);

  const isFormData = config.data instanceof FormData;

  config.headers = {
    ...(config.headers ?? {}),
    ...(userIdHeader ? { 'X-User-Id': userIdHeader } : {}),
    ...(usernameHeader ? { 'X-Username': usernameHeader } : {}),
    'Accept-Language': localeHeader,
    'X-Locale': localeHeader,
  };

  if (token) {
    config.headers = {
      ...(config.headers ?? {}),
      Authorization: `Bearer ${token}`,
    };
  }

  // For FormData (file uploads), explicitly set multipart/form-data so Axios
  // does not override it with application/x-www-form-urlencoded in dispatchRequest.
  // React Native XHR then appends the correct boundary when calling send(formData).
  if (isFormData && Platform.OS !== 'web') {
    config.headers['Content-Type'] = 'multipart/form-data';
  }

  return config;
});

// Auto-logout on 401/403
api.interceptors.response.use(
  (response: any) => response,
  (error: any) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401) {
        const { isAuthenticated, logout } = useAuthStore.getState();
        if (isAuthenticated) {
          logout();
        }
      }
      if (status !== 401 && !shouldSuppressGlobalErrorLog(error)) {
        const method = String(error.config?.method ?? 'GET').toUpperCase();
        const url = String(error.config?.url ?? 'unknown');
        const path = useNavigationHistoryStore.getState().currentPath ?? 'unknown';
        trackProductEvent(ProductEventName.ERROR_ENCOUNTERED, {
          'error category': 'api',
          'error message': sanitizeAmplitudeErrorMessage(
            error.response?.data?.message ?? error.message ?? 'Request failed',
          ),
          'error context': buildSanitizedErrorContext(method, url),
          'http status code': status ?? null,
          'is retryable': isRetryableStatus(status),
          'source surface': path,
        });
        logApiError('api', error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
