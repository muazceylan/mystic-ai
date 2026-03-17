import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { experimental_createQueryPersister } from '@tanstack/query-persist-client-core';

const CACHE_MAX_AGE = 1000 * 60 * 60 * 24; // 24 saat
const PERSIST_PREFIX = 'mystic-query';

const persister = experimental_createQueryPersister({
  storage: AsyncStorage,
  maxAge: CACHE_MAX_AGE,
  prefix: PERSIST_PREFIX,
  // Cold start'ta tüm restore edilen query'lerin aynı anda refetch yapmasını önler.
  // Tazelenme; staleTime dolduğunda mount/reconnect üzerinden doğal olarak gerçekleşir.
  refetchOnRestore: false,
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

export { persister };
