import { useQuery } from '@tanstack/react-query';
import {
  fetchLocationCities,
  fetchLocationCountries,
  getFallbackLocationCities,
  getFallbackLocationCountries,
} from '../services/locationCatalog.service';

// Location data is large and changes with backend deploys — don't persist to AsyncStorage.
// In-memory React Query cache is sufficient for a session.
const LOCATION_CATALOG_STALE_TIME = 1000 * 60 * 30; // 30 minutes in-memory

export function useLocationCountries() {
  return useQuery({
    queryKey: ['location-catalog', 'countries'],
    queryFn: fetchLocationCountries,
    initialData: getFallbackLocationCountries,
    initialDataUpdatedAt: 0,
    staleTime: LOCATION_CATALOG_STALE_TIME,
    persister: undefined,
  });
}

export function useLocationCities(countryCode: string) {
  return useQuery({
    queryKey: ['location-catalog', 'cities', countryCode],
    queryFn: () => fetchLocationCities(countryCode),
    enabled: Boolean(countryCode),
    initialData: () => getFallbackLocationCities(countryCode),
    initialDataUpdatedAt: 0,
    staleTime: LOCATION_CATALOG_STALE_TIME,
    persister: undefined,
  });
}
