import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { experimental_createQueryPersister } from '@tanstack/query-persist-client-core';

const CACHE_MAX_AGE = 1000 * 60 * 60 * 24; // 24 saat
const PERSIST_PREFIX = 'mystic-query';
const QUERY_CACHE_SCOPE_STORAGE_KEY = 'query-cache-scope:v1';

const persister = experimental_createQueryPersister({
  storage: AsyncStorage,
  maxAge: CACHE_MAX_AGE,
  prefix: PERSIST_PREFIX,
  // Cold start'ta tüm restore edilen query'lerin aynı anda refetch yapmasını önler.
  // Tazelenme; staleTime dolduğunda mount/reconnect üzerinden doğal olarak gerçekleşir.
  refetchOnRestore: false,
  filters: {
    // RevenueCat offerings, StoreKit'ten canlı çekilen fiyat/para birimi (currencyCode) verisi taşır.
    // Bunu diskte 24 saat boyunca cache'lemek, storefront/bölge değiştiğinde (ör. sandbox test hesabı)
    // paywall'da bayat bir para birimi gösterip satın alma anında StoreKit'in gerçek (güncel) fiyatını
    // sunmasına yol açabilir. Bu query her zaman network'ten taze çekilsin diye persist dışı bırakılıyor.
    predicate: (query) => !(query.queryKey[0] === 'monetization' && query.queryKey[1] === 'offerings'),
  },
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 dakika - yenileme aralığı
      gcTime: CACHE_MAX_AGE, // garbage collection = maxAge ile uyumlu
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      persister: persister.persisterFn,
      networkMode: 'offlineFirst' as const, // Önce cache, sonra network
    },
  },
});

export async function clearPersistedQueryCache(): Promise<void> {
  queryClient.clear();

  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const persistedQueryKeys = allKeys.filter((key) => key.startsWith(PERSIST_PREFIX));
    if (persistedQueryKeys.length > 0) {
      await AsyncStorage.multiRemove(persistedQueryKeys);
    }
  } catch {
    // ignore storage cleanup failures
  }
}

export async function syncPersistedQueryCacheScope(scopeKey: string): Promise<void> {
  try {
    const previousScope = await AsyncStorage.getItem(QUERY_CACHE_SCOPE_STORAGE_KEY);
    if (previousScope && previousScope !== scopeKey) {
      await clearPersistedQueryCache();
    }
    await AsyncStorage.setItem(QUERY_CACHE_SCOPE_STORAGE_KEY, scopeKey);
  } catch {
    // ignore scope sync failures
  }
}

export { persister };
