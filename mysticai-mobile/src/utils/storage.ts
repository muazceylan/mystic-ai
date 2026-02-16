import { MMKV } from 'react-native-mmkv';

const mmkv = new MMKV({ id: 'mysticai-storage' });

export const storage = {
  getString: (key: string): string | undefined => mmkv.getString(key),
  set: (key: string, value: string) => mmkv.set(key, value),
  delete: (key: string) => mmkv.delete(key),
  clearAll: () => mmkv.clearAll(),
  contains: (key: string): boolean => mmkv.contains(key),
};

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const getToken = (): string | null => storage.getString(TOKEN_KEY) ?? null;
export const setToken = (token: string) => storage.set(TOKEN_KEY, token);
export const removeToken = () => storage.delete(TOKEN_KEY);

export const getRefreshToken = (): string | null => storage.getString(REFRESH_TOKEN_KEY) ?? null;
export const setRefreshToken = (token: string) => storage.set(REFRESH_TOKEN_KEY, token);
export const removeRefreshToken = () => storage.delete(REFRESH_TOKEN_KEY);

export const clearAll = () => storage.clearAll();

// Zustand persist adapter (synchronous MMKV wrapped in async interface)
export const zustandStorage = {
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  getItem: (key: string): string | null => {
    return storage.getString(key) ?? null;
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
};
