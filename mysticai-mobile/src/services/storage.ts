import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  authStore: 'auth-store',
  authToken: 'auth_token',
};

export interface StorageAdapter {
  setItem: (key: string, value: string) => Promise<void>;
  getItem: (key: string) => Promise<string | null>;
  removeItem: (key: string) => Promise<void>;
}

let mmkvInstance: { getString: (key: string) => string | undefined; set: (key: string, value: string) => void; delete: (key: string) => void } | null = null;

try {
  const { MMKV } = require('react-native-mmkv');
  mmkvInstance = new MMKV();
} catch (error) {
  mmkvInstance = null;
}

const mmkvAdapter: StorageAdapter = {
  setItem: async (key, value) => {
    mmkvInstance?.set(key, value);
  },
  getItem: async (key) => mmkvInstance?.getString(key) ?? null,
  removeItem: async (key) => {
    mmkvInstance?.delete(key);
  },
};

const asyncAdapter: StorageAdapter = {
  setItem: AsyncStorage.setItem,
  getItem: AsyncStorage.getItem,
  removeItem: AsyncStorage.removeItem,
};

export const isMMKVAvailable = Boolean(mmkvInstance);
export const appStorage: StorageAdapter = isMMKVAvailable ? mmkvAdapter : asyncAdapter;
