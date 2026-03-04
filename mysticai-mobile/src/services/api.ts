import axios from 'axios/dist/browser/axios.cjs';
import { getToken } from '../utils/storage';
import { useAuthStore } from '../store/useAuthStore';
import { envConfig } from '../config/env';
import {
  createServiceNotConfiguredError,
  logApiError,
  logWarnOnce,
} from './observability';

const api = axios.create({
  baseURL: envConfig.apiBaseUrl ?? undefined,
  timeout: 15000,
});

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
  const userId =
    authState.user?.id != null
      ? String(authState.user.id)
      : authState.user?.username?.trim() || 'guest';

  config.headers = {
    ...(config.headers ?? {}),
    'X-User-Id': userId,
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
      if (status === 401 || status === 403) {
        const { isAuthenticated, logout } = useAuthStore.getState();
        if (isAuthenticated) {
          logout();
        }
      }
      if (status !== 401 && status !== 403) {
        logApiError('api', error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
