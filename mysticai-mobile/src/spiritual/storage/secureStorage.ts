import AsyncStorage from '@react-native-async-storage/async-storage';

const SECURE_PREFIX = 'mystic:spiritual:secure:';

export interface SecureStorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  deleteItem?: (key: string) => Promise<void>;
}

let adapter: SecureStorageAdapter | null = null;

/**
 * Secure storage skeleton:
 * - Production hedefi: expo-secure-store adapter'i burada configure edilir.
 * - Bu iskelette fallback olarak AsyncStorage kullanilir (gercek secure storage degildir).
 */
export function configureSpiritualSecureStorage(customAdapter: SecureStorageAdapter) {
  adapter = customAdapter;
}

async function fallbackGet(key: string) {
  return AsyncStorage.getItem(SECURE_PREFIX + key);
}

async function fallbackSet(key: string, value: string) {
  await AsyncStorage.setItem(SECURE_PREFIX + key, value);
}

export async function getSecureValue(key: string): Promise<string | null> {
  if (adapter) return adapter.getItem(key);
  return fallbackGet(key);
}

export async function setSecureValue(key: string, value: string): Promise<void> {
  if (adapter) {
    await adapter.setItem(key, value);
    return;
  }
  await fallbackSet(key, value);
}

export async function getOrCreateOfflineQueueKey(): Promise<string> {
  const keyName = 'offline_queue_key';
  const existing = await getSecureValue(keyName);
  if (existing) return existing;

  const generated =
    (globalThis.crypto && 'randomUUID' in globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
      ? globalThis.crypto.randomUUID()
      : `spiritual-${Date.now()}-${Math.round(Math.random() * 1e6)}`;

  await setSecureValue(keyName, generated);
  return generated;
}

/**
 * Placeholder "protection" layer for pending queue payloads.
 * TODO: Replace with real encryption using key from secure storage.
 */
export async function protectQueuePayload(serialized: string): Promise<string> {
  await getOrCreateOfflineQueueKey();
  return serialized;
}

export async function unprotectQueuePayload(serialized: string): Promise<string> {
  await getOrCreateOfflineQueueKey();
  return serialized;
}

