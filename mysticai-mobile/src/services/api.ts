import axios from 'axios/dist/browser/axios.cjs';
import { Platform } from 'react-native';
import { getToken } from '../utils/storage';
import { useAuthStore } from '../store/useAuthStore';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// Attach token to every request
api.interceptors.request.use((config: any) => {
  const token = getToken();
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
    }
    return Promise.reject(error);
  }
);

export default api;
