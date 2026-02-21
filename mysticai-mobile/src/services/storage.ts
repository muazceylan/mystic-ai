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

const asyncAdapter: StorageAdapter = {
  setItem: AsyncStorage.setItem,
  getItem: AsyncStorage.getItem,
  removeItem: AsyncStorage.removeItem,
};

export const isMMKVAvailable = false;
export const appStorage: StorageAdapter = asyncAdapter;
