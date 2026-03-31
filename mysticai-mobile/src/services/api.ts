import axios from 'axios/dist/browser/axios.cjs';
import { getToken } from '../utils/storage';
import { useAuthStore } from '../store/useAuthStore';
import { envConfig } from '../config/env';
import i18n from '../i18n';
import {
  createServiceNotConfiguredError,
  logApiError,
  logWarnOnce,
} from './observability';

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
      if (status !== 401) {
        logApiError('api', error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
