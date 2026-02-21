import AsyncStorage from '@react-native-async-storage/async-storage';

const cache: Record<string, string> = {};

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Initialize in-memory cache for critical keys so synchronous reads return quickly.
(async function initCache() {
  try {
    const t = await AsyncStorage.getItem(TOKEN_KEY);
    if (t != null) cache[TOKEN_KEY] = t;
    const r = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    if (r != null) cache[REFRESH_TOKEN_KEY] = r;
  } catch {
    // ignore init failures; fall back to empty cache
  }
})();

export const storage = {
  getString: (key: string): string | undefined => cache[key],
  set: (key: string, value: unknown) => {
    const v = typeof value === 'string' ? value : JSON.stringify(value);
    cache[key] = v;
    AsyncStorage.setItem(key, v).catch(() => {});
  },
  delete: (key: string) => {
    delete cache[key];
    AsyncStorage.removeItem(key).catch(() => {});
  },
  clearAll: () => {
    Object.keys(cache).forEach((k) => delete cache[k]);
    AsyncStorage.clear().catch(() => {});
  },
  contains: (key: string): boolean => cache[key] !== undefined,
};

export const getToken = async (): Promise<string | null> => {
  const sync = storage.getString(TOKEN_KEY);
  if (sync !== undefined) return sync;
  try {
    const v = await AsyncStorage.getItem(TOKEN_KEY);
    if (v != null) {
      storage.set(TOKEN_KEY, v);
      return v;
    }
  } catch {
    // ignore
  }
  return null;
};
export const setToken = (token: string) => storage.set(TOKEN_KEY, token);
export const removeToken = () => storage.delete(TOKEN_KEY);

export const getRefreshToken = async (): Promise<string | null> => {
  const sync = storage.getString(REFRESH_TOKEN_KEY);
  if (sync !== undefined) return sync;
  try {
    const v = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    if (v != null) {
      storage.set(REFRESH_TOKEN_KEY, v);
      return v;
    }
  } catch {
    // ignore
  }
  return null;
};
export const setRefreshToken = (token: string) => storage.set(REFRESH_TOKEN_KEY, token);
export const removeRefreshToken = () => storage.delete(REFRESH_TOKEN_KEY);

export const clearAll = () => storage.clearAll();

// Async adapter for zustand persist/createJSONStorage
export const zustandStorage = {
  setItem: async (key: string, value: string) => {
    const v = typeof value === 'string' ? value : JSON.stringify(value);
    await AsyncStorage.setItem(key, v);
    cache[key] = v;
  },
  getItem: async (key: string): Promise<string | null> => {
    if (cache[key] !== undefined) return cache[key];
    const v = await AsyncStorage.getItem(key);
    if (v != null) cache[key] = v;
    return v;
  },
  removeItem: async (key: string) => {
    await AsyncStorage.removeItem(key);
    delete cache[key];
  },
};
